package com.ceramicerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * تسجيل كمية تالفة/مكسورة من صنف في مخزن — تُخصم من الرصيد دائماً (الكمية موجبة).
 * Records a damaged/broken quantity of a product in a warehouse — always deducted from stock (positive quantity).
 */
public record DamageRequest(
        @NotNull Long productId,
        @NotNull Long warehouseId,
        @NotNull @DecimalMin(value = "0.001") BigDecimal quantity,
        @NotBlank String reason
) {}
