package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ExpenseDto(
        Long id,
        String category,
        BigDecimal amount,
        LocalDate expenseDate,
        LocalDate salaryPeriod,
        String notes,
        Long branchId,
        String branchName,
        Long employeeId,
        String employeeName,
        Long accountId,
        String accountName,
        String receiptImage,
        String createdByName,
        LocalDateTime createdAt
) {}
