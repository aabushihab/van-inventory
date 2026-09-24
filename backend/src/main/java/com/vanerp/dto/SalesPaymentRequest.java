package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SalesPaymentRequest(
        @NotNull @DecimalMin(value = "0.001", message = "مبلغ الدفعة يجب أن يكون أكبر من صفر") BigDecimal amount,
        String paymentMethod,
        String note,
        Long accountId,
        /** مطلوب عند paymentMethod = CHECK. */
        @jakarta.validation.Valid CheckInfo checkInfo
) {
    public SalesPaymentRequest(BigDecimal amount, String paymentMethod, String note, Long accountId) {
        this(amount, paymentMethod, note, accountId, null);
    }
}
