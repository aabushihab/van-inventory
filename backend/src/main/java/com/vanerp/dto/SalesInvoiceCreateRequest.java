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
        LocalDate dueDate,
        /** مطلوب عند paymentMethod = CHECK مع مبلغ مدفوع. */
        @Valid CheckInfo checkInfo
) {
    public SalesInvoiceCreateRequest(Long customerId, Long warehouseId, Long branchId, List<InvoiceItemRequest> items,
                                     BigDecimal paidAmount, String paymentMethod, Long accountId, String notes, LocalDate dueDate) {
        this(customerId, warehouseId, branchId, items, paidAmount, paymentMethod, accountId, notes, dueDate, null);
    }
}
