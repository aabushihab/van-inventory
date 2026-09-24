package com.vanerp.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * تعديل يدوي لكمية المخزون - الكمية موجبة للزيادة وسالبة للنقصان.
 * Manual stock adjustment - positive quantity to increase, negative to decrease.
 */
public record StockAdjustRequest(
        @NotNull Long productId,
        @NotNull Long warehouseId,
        @NotNull BigDecimal quantity,
        String note,
        BigDecimal purchasePrice,
        BigDecimal salePrice
) {}
