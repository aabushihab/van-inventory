package com.vanerp.service;

import com.vanerp.dto.*;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.ProductRepository;
import com.vanerp.repository.StockItemRepository;
import com.vanerp.repository.VanLoadRepository;
import com.vanerp.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * تحميل البضاعة من مخزن رئيسي إلى سيارة توزيع (LOAD)، وتنزيل المتبقي منها إلى المخزن (UNLOAD).
 * كل سند ينشئ حركتي نقل (خروج من المصدر ودخول للوجهة) مرجعهما رقم السند، ويمكن إلغاؤه بعكسها.
 */
@Service
@RequiredArgsConstructor
public class VanLoadService {

    private final VanLoadRepository vanLoadRepository;
    private final VanService vanService;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final StockService stockService;
    private final VanAccessService vanAccessService;

    @Transactional(readOnly = true)
    public Page<VanLoadDto> search(Long vanId, String loadType, LocalDate from, LocalDate to, Pageable pageable) {
        LocalDateTime start = from != null ? from.atStartOfDay() : LocalDateTime.of(2000, 1, 1, 0, 0);
        LocalDateTime end = to != null ? to.plusDays(1).atStartOfDay() : LocalDateTime.of(3000, 1, 1, 0, 0);
        return vanLoadRepository.search(vanId, parseType(loadType, true), start, end, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public VanLoadDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    @Transactional
    public VanLoadDto create(VanLoadCreateRequest request, User actingUser) {
        Van van = vanService.getOrThrow(request.vanId());
        if (!van.isActive()) throw ApiException.badRequest("السيارة غير فعّالة");
        Warehouse mainWarehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));
        if (!"MAIN".equals(mainWarehouse.getWarehouseType())) {
            throw ApiException.badRequest("يجب اختيار مخزن رئيسي وليس مخزن سيارة");
        }
        VanLoadType type = parseType(request.loadType(), false);

        VanLoad load = VanLoad.builder()
                .loadNumber(generateNumber(type))
                .van(van).warehouse(mainWarehouse).loadType(type)
                .notes(request.notes()).createdBy(actingUser)
                .build();
        for (VanLoadItemRequest itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
            load.getItems().add(VanLoadItem.builder().vanLoad(load).product(product).quantity(itemReq.quantity()).build());
        }
        load = vanLoadRepository.save(load);

        String refType = type == VanLoadType.LOAD ? "VAN_LOAD" : "VAN_UNLOAD";
        moveItems(load, false, refType, actingUser);
        return toDto(load);
    }

    /** تنزيل كل ما تبقّى على السيارة إلى مخزن رئيسي بسند واحد (نهاية جولة التوزيع). */
    @Transactional
    public VanLoadDto unloadAll(Long vanId, VanUnloadAllRequest request, User actingUser) {
        Van van = vanService.getOrThrow(vanId);
        List<VanLoadItemRequest> items = stockItemRepository.findByWarehouseId(van.getWarehouse().getId()).stream()
                .filter(si -> si.getQuantity().signum() > 0)
                .map(si -> new VanLoadItemRequest(si.getProduct().getId(), si.getQuantity()))
                .toList();
        if (items.isEmpty()) throw ApiException.badRequest("لا توجد بضاعة على السيارة لتنزيلها");
        return create(new VanLoadCreateRequest(vanId, request.warehouseId(), VanLoadType.UNLOAD.name(),
                request.notes(), items), actingUser);
    }

    /**
     * جرد السيارة وإغلاق جولتها: تُسجَّل فروقات الجرد (عجز/زيادة) كتعديل مخزون على مخزن السيارة
     * بمرجع VAN_STOCKTAKE، ثم يُنزَّل كل المتبقي فعلياً إلى المخزن الرئيسي بسند تنزيل واحد.
     */
    @Transactional
    public VanCloseResultDto close(Long vanId, VanCloseRequest request, User actingUser) {
        Van van = vanService.getOrThrow(vanId);
        Warehouse vanWarehouse = van.getWarehouse();
        Map<Long, BigDecimal> counted = new HashMap<>();
        if (request.counts() != null) {
            request.counts().forEach(c -> counted.put(c.productId(), c.countedQuantity()));
        }

        Map<Long, StockItem> current = new LinkedHashMap<>();
        stockItemRepository.findByWarehouseId(vanWarehouse.getId()).forEach(si -> current.put(si.getProduct().getId(), si));
        for (Long productId : counted.keySet()) {
            if (!current.containsKey(productId) && counted.get(productId).signum() > 0) {
                Product p = productRepository.findById(productId)
                        .orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
                current.put(productId, StockItem.builder().product(p).warehouse(vanWarehouse).quantity(BigDecimal.ZERO).build());
            }
        }

        String note = "جرد سيارة " + van.getName() + (request.notes() != null && !request.notes().isBlank() ? " - " + request.notes() : "");
        List<VanCloseLineDto> lines = new ArrayList<>();
        BigDecimal shortage = BigDecimal.ZERO, surplus = BigDecimal.ZERO;
        for (StockItem si : current.values()) {
            BigDecimal system = si.getQuantity();
            BigDecimal actual = counted.getOrDefault(si.getProduct().getId(), system);
            BigDecimal variance = actual.subtract(system);
            if (system.signum() == 0 && actual.signum() == 0) continue;
            BigDecimal value = variance.multiply(si.getProduct().getSalePrice());
            if (variance.signum() != 0) {
                stockService.applyMovement(si.getProduct(), vanWarehouse, variance,
                        variance.signum() > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT,
                        "VAN_STOCKTAKE", van.getId(), note, actingUser);
                if (variance.signum() < 0) shortage = shortage.add(value.negate());
                else surplus = surplus.add(value);
            }
            lines.add(new VanCloseLineDto(si.getProduct().getId(), si.getProduct().getName(), si.getProduct().getSku(),
                    system, actual, variance, value));
        }

        boolean hasRemaining = stockItemRepository.findByWarehouseId(vanWarehouse.getId()).stream()
                .anyMatch(si -> si.getQuantity().signum() > 0);
        VanLoadDto voucher = hasRemaining
                ? unloadAll(vanId, new VanUnloadAllRequest(request.warehouseId(), request.notes()), actingUser)
                : null;
        return new VanCloseResultDto(shortage, surplus, lines, voucher);
    }

    /** سيارة المستخدم الحالي وحمولتها، لشاشة "سيارتي" عند المندوب. */
    @Transactional(readOnly = true)
    public MyVanDto myVan(User user) {
        Optional<Van> van = vanAccessService.findVanOf(user);
        if (van.isEmpty()) return new MyVanDto(null, false, List.of());
        return new MyVanDto(vanService.toDto(van.get()), vanAccessService.isRestrictedSalesman(user),
                stockService.findByWarehouse(van.get().getWarehouse().getId()).stream()
                        .filter(s -> s.quantity().signum() > 0).toList());
    }

    @Transactional
    public VanLoadDto cancel(Long id, User actingUser) {
        VanLoad load = getOrThrow(id);
        if (load.getStatus() == VanLoadStatus.CANCELLED) throw ApiException.badRequest("السند ملغى مسبقاً");
        String refType = load.getLoadType() == VanLoadType.LOAD ? "VAN_LOAD_CANCEL" : "VAN_UNLOAD_CANCEL";
        moveItems(load, true, refType, actingUser);
        load.setStatus(VanLoadStatus.CANCELLED);
        load.setCancelledAt(LocalDateTime.now());
        return toDto(vanLoadRepository.save(load));
    }

    /** التحميل: من المخزن الرئيسي إلى السيارة. التنزيل: العكس. والإلغاء يعكس الاتجاه الأصلي. */
    private void moveItems(VanLoad load, boolean reverse, String refType, User actingUser) {
        Warehouse vanWarehouse = load.getVan().getWarehouse();
        boolean toVan = (load.getLoadType() == VanLoadType.LOAD) != reverse;
        Warehouse from = toVan ? load.getWarehouse() : vanWarehouse;
        Warehouse to = toVan ? vanWarehouse : load.getWarehouse();
        String note = (reverse ? "إلغاء " : "") + (load.getLoadType() == VanLoadType.LOAD ? "تحميل" : "تنزيل")
                + " سيارة " + load.getVan().getName() + " - سند " + load.getLoadNumber();
        for (VanLoadItem item : load.getItems()) {
            stockService.applyMovement(item.getProduct(), from, item.getQuantity().negate(), MovementType.TRANSFER_OUT,
                    refType, load.getId(), note, actingUser);
            stockService.applyMovement(item.getProduct(), to, item.getQuantity(), MovementType.TRANSFER_IN,
                    refType, load.getId(), note, actingUser);
        }
    }

    private VanLoadType parseType(String value, boolean allowNull) {
        if (value == null || value.isBlank()) {
            if (allowNull) return null;
            throw ApiException.badRequest("نوع العملية مطلوب");
        }
        try {
            return VanLoadType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("نوع العملية غير صحيح");
        }
    }

    private String generateNumber(VanLoadType type) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long countToday = vanLoadRepository.countByCreatedAtAfter(LocalDate.now().atStartOfDay());
        String suffix = java.util.UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return (type == VanLoadType.LOAD ? "VL-" : "VU-") + datePart + "-" + String.format("%04d", countToday + 1) + "-" + suffix;
    }

    private VanLoad getOrThrow(Long id) {
        return vanLoadRepository.findById(id).orElseThrow(() -> ApiException.notFound("سند التحميل غير موجود"));
    }

    private VanLoadDto toDto(VanLoad l) {
        List<VanLoadItemDto> items = l.getItems().stream().map(it -> new VanLoadItemDto(
                it.getId(), it.getProduct().getId(), it.getProduct().getName(), it.getProduct().getSku(),
                it.getProduct().getUnit().getName(), it.getQuantity())).toList();
        BigDecimal total = l.getItems().stream().map(VanLoadItem::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new VanLoadDto(l.getId(), l.getLoadNumber(), l.getVan().getId(), l.getVan().getName(),
                l.getWarehouse().getId(), l.getWarehouse().getName(), l.getLoadType().name(), l.getStatus().name(),
                l.getNotes(), l.getCreatedBy() != null ? l.getCreatedBy().getFullName() : null,
                l.getCreatedAt(), l.getCancelledAt(), total, items);
    }
}
