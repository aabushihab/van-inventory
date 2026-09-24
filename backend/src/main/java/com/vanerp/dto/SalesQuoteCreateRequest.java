package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SalesQuoteCreateRequest(
        Long customerId,
        @NotNull Long warehouseId,
        @NotNull Long branchId,
        @NotEmpty(message = "يجب إضافة عنصر واحد على الأقل") @Valid List<InvoiceItemRequest> items,
        String notes
) {}
