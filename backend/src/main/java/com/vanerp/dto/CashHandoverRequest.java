package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CashHandoverRequest(
        @NotNull(message = "اختر الصندوق/الحساب المستلم") Long toAccountId,
        @NotNull @DecimalMin(value = "0", message = "المبلغ لا يمكن أن يكون سالباً") BigDecimal handedAmount,
        String notes
) {}
