package com.vanerp.dto;

import java.math.BigDecimal;

/** سطر تسوية سيارة لصنف واحد: رصيد أول المدة + المحمّل - المنزّل - المباع + مرتجعات العملاء ± أخرى = الرصيد الحالي. */
public record VanSettlementLineDto(
        Long productId,
        String productName,
        String productSku,
        String unitName,
        BigDecimal opening,
        BigDecimal loaded,
        BigDecimal unloaded,
        BigDecimal sold,
        BigDecimal customerReturns,
        BigDecimal other,
        BigDecimal closing,
        BigDecimal salePrice,
        BigDecimal closingValue
) {}
