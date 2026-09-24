package com.vanerp.service;

import com.vanerp.dto.DamageCompensationRequest;
import com.vanerp.dto.DamageRequest;
import com.vanerp.dto.DamagedItemDto;
import com.vanerp.dto.StockAdjustRequest;
import com.vanerp.dto.StockItemDto;
import com.vanerp.dto.StockMovementDto;
import com.vanerp.dto.StockTransferRequest;
import com.vanerp.exception.ApiException;
import com.vanerp.model.*;
import com.vanerp.repository.ProductRepository;
import com.vanerp.repository.StockItemRepository;
import com.vanerp.repository.StockMovementRepository;
import com.vanerp.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockService {

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<StockItemDto> findByWarehouse(Long warehouseId) {
        return stockItemRepository.findByWarehouseId(warehouseId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<StockItemDto> findByWarehousePage(Long warehouseId, String q, Long categoryId, Pageable pageable) {
        return stockItemRepository.searchByWarehouse(warehouseId, q, categoryId != null ? categoryId : -1L, pageable)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<StockItemDto> findByProduct(Long productId) {
        return stockItemRepository.findByProductId(productId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<StockItemDto> findLowStock() {
        return stockItemRepository.findLowStockItems().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<StockMovementDto> movements(Long productId, Long warehouseId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        return stockMovementRepository.search(productId, warehouseId, from, to, pageable).map(this::toDto);
    }

    /**
     * تعديل يدوي للمخزون (جرد، تالف، تصحيح خطأ ...الخ).
     */
    @Transactional
    public StockItemDto adjust(StockAdjustRequest request, User actingUser) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));

        MovementType type = request.quantity().signum() >= 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;

        if (request.quantity().signum() > 0 && request.purchasePrice() != null) {
            updateWeightedAverageCost(product, request.quantity(), request.purchasePrice());
        }
        if (request.salePrice() != null) {
            product.setSalePrice(request.salePrice());
            productRepository.save(product);
        }

        StockItem item = applyMovement(product, warehouse, request.quantity(), type, "MANUAL", null, request.note(), actingUser);
        return toDto(item);
    }

    /**
     * يحدّث سعر شراء المنتج تلقائياً كمتوسط مرجح (Weighted Average Cost) بين الكمية والتكلفة الموجودتين
     * سابقاً في كل المخازن، والكمية والسعر الجديدين. هذا يجعل حسابات الربح وقيمة المخزون تعكس تغيّر
     * أسعار الشراء بمرور الوقت سواء جاءت الكمية من فاتورة شراء أو من تعديل مخزون يدوي.
     */
    @Transactional
    public void updateWeightedAverageCost(Product product, BigDecimal purchaseQuantity, BigDecimal purchaseUnitPrice) {
        BigDecimal existingQuantity = stockItemRepository.findByProductId(product.getId()).stream()
                .map(StockItem::getQuantity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal existingCost = product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;

        BigDecimal totalQuantity = existingQuantity.add(purchaseQuantity);
        if (totalQuantity.signum() <= 0) return;

        BigDecimal weightedCost = existingQuantity.multiply(existingCost)
                .add(purchaseQuantity.multiply(purchaseUnitPrice))
                .divide(totalQuantity, 3, RoundingMode.HALF_UP);

        product.setPurchasePrice(weightedCost);
        productRepository.save(product);
    }

    /**
     * نقل بضاعة بين مخزنين (ينشئ حركتين: خروج من المصدر ودخول للوجهة).
     */
    @Transactional
    public void transfer(StockTransferRequest request, User actingUser) {
        if (request.fromWarehouseId().equals(request.toWarehouseId())) {
            throw ApiException.badRequest("لا يمكن النقل إلى نفس المخزن");
        }
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
        Warehouse from = warehouseRepository.findById(request.fromWarehouseId())
                .orElseThrow(() -> ApiException.notFound("مخزن المصدر غير موجود"));
        Warehouse to = warehouseRepository.findById(request.toWarehouseId())
                .orElseThrow(() -> ApiException.notFound("مخزن الوجهة غير موجود"));

        BigDecimal available = getQuantity(product.getId(), from.getId());
        if (available.compareTo(request.quantity()) < 0) {
            throw ApiException.badRequest("الكمية المتوفرة في مخزن المصدر غير كافية (المتوفر: "
                    + available.stripTrailingZeros().toPlainString() + ")");
        }

        applyMovement(product, from, request.quantity().negate(), MovementType.TRANSFER_OUT, "TRANSFER", null, request.note(), actingUser);
        applyMovement(product, to, request.quantity(), MovementType.TRANSFER_IN, "TRANSFER", null, request.note(), actingUser);
    }

    /**
     * تسجيل بضاعة تالفة/مكسورة — تخصم دائماً من الرصيد وتُسجَّل كحركة من نوع DAMAGED مستقلة عن التعديل اليدوي العادي.
     * Records damaged/broken goods — always deducted from stock, logged as a DAMAGED movement distinct from a regular manual adjustment.
     */
    @Transactional
    public void recordDamage(DamageRequest request, User actingUser) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> ApiException.notFound("المنتج غير موجود"));
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> ApiException.notFound("المخزن غير موجود"));

        applyMovement(product, warehouse, request.quantity().negate(), MovementType.DAMAGED,
                "DAMAGE", null, request.reason(), actingUser);
    }

    @Transactional(readOnly = true)
    public Page<DamagedItemDto> damaged(Long productId, Long warehouseId, Pageable pageable) {
        Page<StockMovement> page;
        if (productId != null) {
            page = stockMovementRepository.findByMovementTypeAndProductIdOrderByCreatedAtDesc(MovementType.DAMAGED, productId, pageable);
        } else if (warehouseId != null) {
            page = stockMovementRepository.findByMovementTypeAndWarehouseIdOrderByCreatedAtDesc(MovementType.DAMAGED, warehouseId, pageable);
        } else {
            page = stockMovementRepository.findByMovementTypeOrderByCreatedAtDesc(MovementType.DAMAGED, pageable);
        }
        return page.map(this::toDamagedDto);
    }

    /**
     * تعويض المورد عن كمية من بضاعة تالفة سابقاً (استبدال) — يعيد الكمية للمخزون ويخصمها من صافي الخسارة
     * المسجّلة على حركة التلف الأصلية، دون تجاوز الكمية التالفة الأصلية.
     */
    @Transactional
    public void compensateDamage(Long damageMovementId, DamageCompensationRequest request, User actingUser) {
        StockMovement damage = stockMovementRepository.findById(damageMovementId)
                .orElseThrow(() -> ApiException.notFound("سجل التلف غير موجود"));
        if (damage.getMovementType() != MovementType.DAMAGED) {
            throw ApiException.badRequest("هذه الحركة ليست سجل تلف");
        }

        BigDecimal damagedQuantity = damage.getQuantity().abs();
        BigDecimal remaining = damagedQuantity.subtract(damage.getCompensatedQuantity());
        if (request.quantity().compareTo(remaining) > 0) {
            throw ApiException.badRequest("الكمية المطلوب تعويضها أكبر من المتبقي غير المعوَّض ("
                    + remaining.stripTrailingZeros().toPlainString() + ")");
        }

        applyMovement(damage.getProduct(), damage.getWarehouse(), request.quantity(), MovementType.DAMAGE_COMPENSATED,
                "DAMAGE_COMPENSATION", damage.getId(), request.note(), actingUser);

        damage.setCompensatedQuantity(damage.getCompensatedQuantity().add(request.quantity()));
        stockMovementRepository.save(damage);
    }

    private DamagedItemDto toDamagedDto(StockMovement m) {
        BigDecimal originalQuantity = m.getQuantity().abs();
        BigDecimal remaining = originalQuantity.subtract(m.getCompensatedQuantity());
        BigDecimal unitCost = m.getProduct().getPurchasePrice();
        BigDecimal lostValue = unitCost.multiply(remaining);
        String status = remaining.signum() <= 0 ? "COMPENSATED" : "ACTIVE";
        return new DamagedItemDto(
                m.getId(), m.getProduct().getId(), m.getProduct().getName(), m.getProduct().getSku(),
                m.getWarehouse().getId(), m.getWarehouse().getName(),
                originalQuantity, m.getCompensatedQuantity(), remaining, unitCost, lostValue, status, m.getNote(),
                m.getCreatedBy() != null ? m.getCreatedBy().getFullName() : null,
                m.getCreatedAt()
        );
    }

    public BigDecimal getQuantity(Long productId, Long warehouseId) {
        return stockItemRepository.findByProductIdAndWarehouseId(productId, warehouseId)
                .map(StockItem::getQuantity)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * النواة المشتركة لكل حركات المخزون: تحدّث الرصيد، تسجل الحركة، وتفحص حد نقصان المخزون.
     * الكمية موجبة = دخول، سالبة = خروج.
     */
    @Transactional
    public StockItem applyMovement(Product product, Warehouse warehouse, BigDecimal quantity,
                                    MovementType type, String referenceType, Long referenceId,
                                    String note, User actingUser) {
        StockItem item = stockItemRepository.findByProductIdAndWarehouseId(product.getId(), warehouse.getId())
                .orElseGet(() -> StockItem.builder()
                        .product(product).warehouse(warehouse).quantity(BigDecimal.ZERO).build());

        BigDecimal newQuantity = item.getQuantity().add(quantity);
        if (newQuantity.signum() < 0) {
            throw ApiException.badRequest("الكمية المتوفرة غير كافية لإتمام العملية (المتوفر: "
                    + item.getQuantity().stripTrailingZeros().toPlainString() + ")");
        }
        item.setQuantity(newQuantity);
        item.setUpdatedAt(LocalDateTime.now());
        item = stockItemRepository.save(item);

        StockMovement movement = StockMovement.builder()
                .product(product).warehouse(warehouse).movementType(type)
                .quantity(quantity).balanceAfter(newQuantity)
                .referenceType(referenceType).referenceId(referenceId)
                .note(note).createdBy(actingUser).build();
        stockMovementRepository.save(movement);

        if (product.getMinStockThreshold() != null && product.getMinStockThreshold().signum() > 0
                && newQuantity.compareTo(product.getMinStockThreshold()) <= 0) {
            notificationService.raiseLowStockAlertIfNeeded(product, warehouse, newQuantity);
        }

        return item;
    }

    private StockItemDto toDto(StockItem si) {
        boolean low = si.getProduct().getMinStockThreshold() != null
                && si.getProduct().getMinStockThreshold().signum() > 0
                && si.getQuantity().compareTo(si.getProduct().getMinStockThreshold()) <= 0;
        return new StockItemDto(
                si.getId(), si.getProduct().getId(), si.getProduct().getName(), si.getProduct().getSku(),
                si.getWarehouse().getId(), si.getWarehouse().getName(),
                si.getQuantity(), si.getProduct().getMinStockThreshold(), low
        );
    }

    private StockMovementDto toDto(StockMovement m) {
        return new StockMovementDto(
                m.getId(), m.getProduct().getId(), m.getProduct().getName(),
                m.getWarehouse().getId(), m.getWarehouse().getName(),
                m.getMovementType().name(), m.getQuantity(), m.getBalanceAfter(),
                m.getReferenceType(), m.getReferenceId(), m.getNote(),
                m.getCreatedBy() != null ? m.getCreatedBy().getFullName() : null,
                m.getCreatedAt()
        );
    }
}
