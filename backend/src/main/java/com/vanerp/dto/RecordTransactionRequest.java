package com.vanerp.dto;

import com.vanerp.model.TxDirection;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/** طلب تسجيل حركة يدوية أو حركة رأس مال (سحب/إضافة) على حساب. */
public record RecordTransactionRequest(
        @NotNull Long accountId,
        @NotNull TxDirection direction,
        @NotNull @DecimalMin(value = "0.001", message = "المبلغ يجب أن يكون أكبر من صفر") BigDecimal amount,
        @NotNull LocalDate transactionDate,
        String notes
) {}
