package com.vanerp.dto;

import java.math.BigDecimal;

public record PurchaseReturnItemDto(
        Long id,
        Long invoiceItemId,
        Long productId,
        String productName,
        String sku,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal lineValue
) {}
