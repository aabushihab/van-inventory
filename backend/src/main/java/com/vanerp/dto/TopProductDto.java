package com.vanerp.dto;

import java.math.BigDecimal;

public record TopProductDto(
        Long productId,
        String productName,
        String sku,
        BigDecimal totalQuantity,
        BigDecimal totalRevenue
) {}
