package com.ceramicerp.dto;

import java.math.BigDecimal;

public record SalesReturnItemDto(
        Long id,
        Long invoiceItemId,
        Long productId,
        String productName,
        String sku,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal lineValue
) {}
