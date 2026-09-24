package com.vanerp.dto;

import java.math.BigDecimal;

public record VanShortageItemDto(
        Long productId,
        String productName,
        String productSku,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal lineValue
) {}
