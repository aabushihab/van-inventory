package com.ceramicerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SalesPaymentRequest(
        @NotNull @DecimalMin(value = "0.001", message = "مبلغ الدفعة يجب أن يكون أكبر من صفر") BigDecimal amount,
        String paymentMethod,
        String note,
        Long accountId
) {}
