package com.ceramicerp.dto;

import java.math.BigDecimal;

public record StocktakeLineDto(
        Long id,
        Long productId,
        String productName,
        String sku,
        BigDecimal systemQuantity,
        BigDecimal countedQuantity,
        BigDecimal variance
) {}
