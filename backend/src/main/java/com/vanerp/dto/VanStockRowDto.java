package com.vanerp.dto;

import java.math.BigDecimal;

/** صنف موجود حالياً على السيارة. */
public record VanStockRowDto(
        Long productId,
        String productName,
        String productSku,
        String unitName,
        BigDecimal quantity,
        BigDecimal salePrice,
        BigDecimal value
) {}
