package com.vanerp.dto;

import java.math.BigDecimal;

/** ملخص حركة صنف معيّن خلال فترة (يوم/أسبوع/شهر): كمية داخلة، كمية خارجة، وصافي التغيّر. */
public record StockMovementSummaryDto(
        String period,
        Long productId,
        String productName,
        String sku,
        BigDecimal quantityIn,
        BigDecimal quantityOut,
        BigDecimal net
) {}
