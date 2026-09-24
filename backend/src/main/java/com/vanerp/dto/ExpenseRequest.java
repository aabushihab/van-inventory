package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(
        @NotBlank String category,
        @NotNull @DecimalMin(value = "0.001") BigDecimal amount,
        @NotNull LocalDate expenseDate,
        LocalDate salaryPeriod,
        String notes,
        Long branchId,
        Long employeeId,
        Long accountId,
        String receiptImage
) {}
