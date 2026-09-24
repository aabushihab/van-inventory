package com.ceramicerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PurchaseInvoiceCreateRequest(
        Long supplierId,
        @NotNull Long warehouseId,
        @NotNull Long branchId,
        @NotEmpty(message = "يجب إضافة عنصر واحد على الأقل") @Valid List<InvoiceItemRequest> items,
        java.math.BigDecimal paidAmount,
        Long accountId,
        String notes,
        java.time.LocalDate dueDate
) {}
