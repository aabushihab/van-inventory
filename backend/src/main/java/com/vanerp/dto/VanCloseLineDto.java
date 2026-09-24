package com.vanerp.dto;

import java.math.BigDecimal;

public record VanCloseLineDto(
        Long productId,
        String productName,
        String productSku,
        BigDecimal systemQuantity,
        BigDecimal countedQuantity,
        BigDecimal variance,
        BigDecimal varianceValue
) {}
