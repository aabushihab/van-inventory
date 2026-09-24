package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record VanCountLine(
        @NotNull Long productId,
        @NotNull @DecimalMin(value = "0", message = "الكمية المعدودة لا يمكن أن تكون سالبة") BigDecimal countedQuantity
) {}
