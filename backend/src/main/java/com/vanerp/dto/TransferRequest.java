package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** تحويل مبلغ من حساب لآخر (مثلاً كاش → بنك) - نفس الفلوس تنتقل مكان، ليست دخل/خرج فعلي للمحل. */
public record TransferRequest(
        @NotNull Long fromAccountId,
        @NotNull Long toAccountId,
        @NotNull @DecimalMin(value = "0.001", message = "المبلغ يجب أن يكون أكبر من صفر") BigDecimal amount,
        @NotNull LocalDate transactionDate,
        String notes
) {}
