package com.vanerp.service;

import com.vanerp.dto.VanDto;
import com.vanerp.dto.VanSettlementDto;
import com.vanerp.dto.VanSettlementLineDto;
import com.vanerp.dto.VanUpsertRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VanService {

    private final VanRepository vanRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final ProductRepository productRepository;
    private final AccountRepository accountRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public List<VanDto> findAll() {
        return vanRepository.findAll().stream()
                .sorted(Comparator.comparing(Van::getCode))
                .map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public VanDto findById(Long id) {
        return toDto(getOrThrow(id));
    }

    /** إنشاء سيارة ينشئ معها تلقائياً مخزناً خاصاً بها (نوع VAN) لتتبّع حمولتها. */
    @Transactional
    public VanDto create(VanUpsertRequest request) {
        validateUniqueness(request, null);
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));
        boolean active = request.active() == null || request.active();
        Employee driver = resolveDriver(request.driverId());

        Warehouse warehouse = warehouseRepository.save(Warehouse.builder()
                .branch(branch)
                .name(vanWarehouseName(request))
                .nameEn("Van " + request.code().trim())
                .location(request.plateNumber())
                .warehouseType("VAN")
                .isDefault(false)
                .active(active)
                .build());

        Van van = Van.builder()
                .code(request.code().trim())
                .name(request.name().trim())
                .plateNumber(request.plateNumber().trim())
                .driver(driver)
                .driverName(driver.getName())
                .driverPhone(driver.getPhone())
                .salesman(resolveSalesman(request.salesmanId()))
                .warehouse(warehouse)
                .cashAccount(accountRepository.save(Account.builder()
                        .name(vanCashName(request)).type(AccountType.CASH).branch(branch).active(active).build()))
                .notes(request.notes())
                .active(active)
                .build();
        return toDto(vanRepository.save(van));
    }

    @Transactional
    public VanDto update(Long id, VanUpsertRequest request) {
        Van van = getOrThrow(id);
        validateUniqueness(request, id);
        Branch branch = branchRepository.findById(request.branchId())
                .orElseThrow(() -> ApiException.notFound("الفرع غير موجود"));

        van.setCode(request.code().trim());
        van.setName(request.name().trim());
        van.setPlateNumber(request.plateNumber().trim());
        Employee driver = resolveDriver(request.driverId());
        van.setDriver(driver);
        van.setDriverName(driver.getName());
        van.setDriverPhone(driver.getPhone());
        van.setSalesman(resolveSalesman(request.salesmanId()));
        van.setNotes(request.notes());
        if (request.active() != null) van.setActive(request.active());

        Warehouse warehouse = van.getWarehouse();
        warehouse.setBranch(branch);
        warehouse.setName(vanWarehouseName(request));
        warehouse.setNameEn("Van " + request.code().trim());
        warehouse.setLocation(request.plateNumber());
        warehouse.setActive(van.isActive());
        warehouseRepository.save(warehouse);

        Account cash = van.getCashAccount();
        if (cash == null) {
            cash = Account.builder().type(AccountType.CASH).build();
            van.setCashAccount(cash);
        }
        cash.setName(vanCashName(request));
        cash.setBranch(branch);
        cash.setActive(van.isActive());
        accountRepository.save(cash);

        return toDto(vanRepository.save(van));
    }

    /** الحذف مسموح فقط لسيارة بلا أي حركة بضاعة، وإلا تُعطَّل حفاظاً على السجلات. */
    @Transactional
    public void delete(Long id) {
        Van van = getOrThrow(id);
        Warehouse warehouse = van.getWarehouse();
        if (stockItemRepository.existsByWarehouseIdAndQuantityNot(warehouse.getId(), BigDecimal.ZERO)) {
            throw ApiException.badRequest("لا يمكن حذف سيارة عليها بضاعة - نزّل حمولتها أولاً");
        }
        if (stockMovementRepository.existsByWarehouseId(warehouse.getId())) {
            van.setActive(false);
            warehouse.setActive(false);
            vanRepository.save(van);
            return;
        }
        Account cash = van.getCashAccount();
        vanRepository.delete(van);
        vanRepository.flush();
        if (cash != null) accountRepository.delete(cash);
        stockItemRepository.deleteAll(stockItemRepository.findByWarehouseId(warehouse.getId()));
        warehouseRepository.delete(warehouse);
    }

    /**
     * تسوية السيارة لفترة: لكل صنف مرّ على السيارة يُحسب رصيد أول المدة، المحمّل، المنزّل، المباع،
     * مرتجعات العملاء، وأي حركات أخرى (تالف/تعديل/جرد)، ثم الرصيد الختامي. مع ملخص المبيعات والتحصيل.
     */
    @Transactional(readOnly = true)
    public VanSettlementDto settlement(Long vanId, LocalDate from, LocalDate to) {
        Van van = getOrThrow(vanId);
        Long warehouseId = van.getWarehouse().getId();
        LocalDate fromDate = from != null ? from : LocalDate.now();
        LocalDate toDate = to != null ? to : fromDate;
        if (toDate.isBefore(fromDate)) throw ApiException.badRequest("تاريخ النهاية قبل تاريخ البداية");
        LocalDateTime start = fromDate.atStartOfDay();
        LocalDateTime end = toDate.plusDays(1).atStartOfDay();

        Map<Long, Acc> byProduct = new LinkedHashMap<>();
        for (Object[] row : stockMovementRepository.sumByProductBefore(warehouseId, start)) {
            Acc acc = byProduct.computeIfAbsent((Long) row[0], k -> new Acc());
            acc.opening = acc.opening.add((BigDecimal) row[1]);
        }
        for (StockMovement m : stockMovementRepository.findByWarehouseBetween(warehouseId, start, end)) {
            Acc acc = byProduct.computeIfAbsent(m.getProduct().getId(), k -> new Acc());
            String ref = m.getReferenceType() != null ? m.getReferenceType() : "";
            BigDecimal q = m.getQuantity();
            if (ref.startsWith("VAN_LOAD")) {
                acc.loaded = acc.loaded.add(q);
            } else if (ref.startsWith("VAN_UNLOAD")) {
                acc.unloaded = acc.unloaded.subtract(q);
            } else if (m.getMovementType() == MovementType.SALE_OUT
                    || ref.equals("SALES_INVOICE_CANCEL") || ref.equals("SALES_INVOICE_EDIT")) {
                acc.sold = acc.sold.subtract(q);
            } else if (ref.equals("SALES_RETURN")) {
                acc.customerReturns = acc.customerReturns.add(q);
            } else {
                acc.other = acc.other.add(q);
            }
        }

        Map<Long, Product> products = new HashMap<>();
        productRepository.findAllById(byProduct.keySet()).forEach(p -> products.put(p.getId(), p));

        List<VanSettlementLineDto> lines = new ArrayList<>();
        BigDecimal closingValue = BigDecimal.ZERO;
        for (Map.Entry<Long, Acc> e : byProduct.entrySet()) {
            Acc a = e.getValue();
            if (a.isEmpty()) continue;
            BigDecimal closing = a.opening.add(a.loaded).subtract(a.unloaded).subtract(a.sold)
                    .add(a.customerReturns).add(a.other);
            Product p = products.get(e.getKey());
            BigDecimal value = closing.multiply(p.getSalePrice());
            closingValue = closingValue.add(value);
            lines.add(new VanSettlementLineDto(p.getId(), p.getName(), p.getSku(), p.getUnit().getName(),
                    a.opening, a.loaded, a.unloaded, a.sold, a.customerReturns, a.other, closing,
                    p.getSalePrice(), value));
        }
        lines.sort(Comparator.comparing(VanSettlementLineDto::productName));

        List<SalesInvoice> invoices = salesInvoiceRepository.findByWarehouseBetween(warehouseId, start, end);
        BigDecimal salesTotal = invoices.stream().map(SalesInvoice::getGrandTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal collected = invoices.stream().map(SalesInvoice::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal credit = salesTotal.subtract(collected).max(BigDecimal.ZERO);

        return new VanSettlementDto(van.getId(), van.getName(),
                van.getSalesman() != null ? van.getSalesman().getFullName() : null,
                fromDate, toDate, invoices.size(), salesTotal, collected, credit, closingValue, lines);
    }

    /** رمز السيارة ورقم لوحتها فريدان، والمندوب الواحد مربوط بسيارة فعّالة واحدة فقط. */
    private void validateUniqueness(VanUpsertRequest request, Long selfId) {
        for (Van other : vanRepository.findAll()) {
            if (other.getId().equals(selfId)) continue;
            if (other.getCode().equalsIgnoreCase(request.code().trim())) {
                throw ApiException.conflict("رمز السيارة مستخدم مسبقاً");
            }
            if (other.getPlateNumber() != null && other.getPlateNumber().equals(request.plateNumber().trim())) {
                throw ApiException.conflict("رقم اللوحة مسجّل لسيارة أخرى");
            }
            boolean willBeActive = request.active() == null || request.active();
            if (willBeActive && other.isActive() && other.getDriver() != null
                    && other.getDriver().getId().equals(request.driverId())) {
                throw ApiException.conflict("هذا السائق مربوط مسبقاً بالسيارة " + other.getName());
            }
            if (willBeActive && other.isActive() && request.salesmanId() != null && other.getSalesman() != null
                    && other.getSalesman().getId().equals(request.salesmanId())) {
                throw ApiException.conflict("هذا المندوب مربوط مسبقاً بالسيارة " + other.getName());
            }
        }
    }

    Van getOrThrow(Long id) {
        return vanRepository.findById(id).orElseThrow(() -> ApiException.notFound("السيارة غير موجودة"));
    }

    private Employee resolveDriver(Long driverId) {
        Employee driver = employeeRepository.findById(driverId)
                .orElseThrow(() -> ApiException.notFound("السائق غير موجود"));
        if (!EmployeePosition.DRIVER.name().equals(driver.getPosition())) {
            throw ApiException.badRequest("الموظف المختار ليست وظيفته سائق");
        }
        if (!driver.isActive()) throw ApiException.badRequest("السائق المختار غير فعّال");
        return driver;
    }

    private User resolveSalesman(Long salesmanId) {
        if (salesmanId == null) return null;
        return userRepository.findById(salesmanId).orElseThrow(() -> ApiException.notFound("المندوب غير موجود"));
    }

    private String vanCashName(VanUpsertRequest request) {
        return "صندوق سيارة " + request.code().trim();
    }

    private String vanWarehouseName(VanUpsertRequest request) {
        return "سيارة " + request.code().trim() + " - " + request.name().trim();
    }

    VanDto toDto(Van v) {
        BigDecimal qty = BigDecimal.ZERO;
        BigDecimal value = BigDecimal.ZERO;
        for (StockItem si : stockItemRepository.findByWarehouseId(v.getWarehouse().getId())) {
            qty = qty.add(si.getQuantity());
            value = value.add(si.getQuantity().multiply(si.getProduct().getSalePrice()));
        }
        Employee d = v.getDriver();
        return new VanDto(v.getId(), v.getCode(), v.getName(), v.getPlateNumber(),
                d != null ? d.getId() : null,
                d != null ? d.getName() : v.getDriverName(),
                d != null ? d.getPhone() : v.getDriverPhone(),
                v.getSalesman() != null ? v.getSalesman().getId() : null,
                v.getSalesman() != null ? v.getSalesman().getFullName() : null,
                v.getWarehouse().getId(), v.getWarehouse().getName(), v.getWarehouse().getBranch().getId(),
                v.getCashAccount() != null ? v.getCashAccount().getId() : null,
                v.getCashAccount() != null ? v.getCashAccount().getName() : null,
                v.getNotes(), v.isActive(), qty, value);
    }

    private static class Acc {
        BigDecimal opening = BigDecimal.ZERO;
        BigDecimal loaded = BigDecimal.ZERO;
        BigDecimal unloaded = BigDecimal.ZERO;
        BigDecimal sold = BigDecimal.ZERO;
        BigDecimal customerReturns = BigDecimal.ZERO;
        BigDecimal other = BigDecimal.ZERO;

        boolean isEmpty() {
            return opening.signum() == 0 && loaded.signum() == 0 && unloaded.signum() == 0
                    && sold.signum() == 0 && customerReturns.signum() == 0 && other.signum() == 0;
        }
    }
}
