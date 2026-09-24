package com.ceramicerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** تسجيل استرجاع مبلغ نقداً للعميل، لتصفير "مستحق الإرجاع" الناتج عن دفع كامل ثم إرجاع بضاعة. */
public record SalesRefundRequest(
        @NotNull @DecimalMin(value = "0.001", message = "المبلغ يجب أن يكون أكبر من صفر") BigDecimal amount,
        String note,
        Long accountId
) {}
