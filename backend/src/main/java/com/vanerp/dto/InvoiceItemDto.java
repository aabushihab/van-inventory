package com.vanerp.dto;

import java.math.BigDecimal;

public record InvoiceItemDto(
        Long id,
        Long productId,
        String productName,
        String productSku,
        String unitName,
        Long warehouseId,
        String warehouseName,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal taxRate,
        BigDecimal discount,
        BigDecimal lineTotal,
        BigDecimal returnedQuantity,
        String packType,
        BigDecimal packQuantity,
        BigDecimal packSize
) {
    /** سطر بالوحدة الأساسية (فواتير الشراء). */
    public InvoiceItemDto(Long id, Long productId, String productName, String productSku, String unitName,
                          Long warehouseId, String warehouseName, BigDecimal quantity, BigDecimal unitPrice,
                          BigDecimal taxRate, BigDecimal discount, BigDecimal lineTotal, BigDecimal returnedQuantity) {
        this(id, productId, productName, productSku, unitName, warehouseId, warehouseName, quantity, unitPrice,
                taxRate, discount, lineTotal, returnedQuantity, "UNIT", quantity, BigDecimal.ONE);
    }
}
