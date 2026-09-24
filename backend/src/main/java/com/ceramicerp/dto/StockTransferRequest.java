package com.ceramicerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record StockTransferRequest(
        @NotNull Long productId,
        @NotNull Long fromWarehouseId,
        @NotNull Long toWarehouseId,
        @NotNull @DecimalMin(value = "0.001", message = "الكمية يجب أن تكون أكبر من صفر") BigDecimal quantity,
        String note
) {}
