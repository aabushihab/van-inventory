package com.vanerp.dto;

import java.math.BigDecimal;

public record VanLoadItemDto(
        Long id,
        Long productId,
        String productName,
        String productSku,
        String unitName,
        BigDecimal quantity
) {}
