package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** تسجيل استرجاع مبلغ نقداً من المورد، لتصفير "مستحق الإرجاع" الناتج عن دفع كامل ثم إلغاء/إرجاع فاتورة شراء. */
public record PurchaseRefundRequest(
        @NotNull @DecimalMin(value = "0.001", message = "المبلغ يجب أن يكون أكبر من صفر") BigDecimal amount,
        String note,
        Long accountId
) {}
