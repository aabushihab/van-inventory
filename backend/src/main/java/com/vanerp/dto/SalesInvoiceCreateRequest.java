package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesInvoiceCreateRequest(
        Long customerId,
        @NotNull Long warehouseId,
        @NotNull Long branchId,
        @NotEmpty(message = "يجب إضافة عنصر واحد على الأقل") @Valid List<InvoiceItemRequest> items,
        BigDecimal paidAmount,
        String paymentMethod,
        Long accountId,
        String notes,
        LocalDate dueDate
) {}
