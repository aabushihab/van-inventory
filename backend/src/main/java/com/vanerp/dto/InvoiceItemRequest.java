package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * سطر فاتورة. packType = UNIT (بالحبة/الوحدة) أو CARTON (بالكرتونة): عند CARTON تكون quantity عدد الكراتين
 * و unitPrice سعر الكرتونة، ويحوّلها الخادم للوحدة الأساسية (packQuantity/packSize يعبّئها الخادم).
 */
public record InvoiceItemRequest(
        @NotNull Long productId,
        Long warehouseId,
        @NotNull @DecimalMin(value = "0.001", message = "الكمية يجب أن تكون أكبر من صفر") BigDecimal quantity,
        @NotNull BigDecimal unitPrice,
        BigDecimal taxRate,
        BigDecimal discount,
        String packType,
        BigDecimal packQuantity,
        BigDecimal packSize
) {
    public InvoiceItemRequest(Long productId, Long warehouseId, BigDecimal quantity, BigDecimal unitPrice,
                              BigDecimal taxRate, BigDecimal discount) {
        this(productId, warehouseId, quantity, unitPrice, taxRate, discount, null, null, null);
    }
}
