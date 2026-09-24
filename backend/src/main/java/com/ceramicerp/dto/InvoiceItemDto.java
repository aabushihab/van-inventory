package com.ceramicerp.dto;

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
        BigDecimal returnedQuantity
) {}
