package com.vanerp.dto;

import java.math.BigDecimal;

/** صنف يمكن للسائق طلبه (بدون أسعار شراء أو مخزون المستودعات). */
public record RequestableProductDto(
        Long id,
        String name,
        String sku,
        String unitName,
        BigDecimal unitsPerCarton
) {}
