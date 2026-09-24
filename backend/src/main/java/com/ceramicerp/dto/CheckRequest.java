package com.ceramicerp.dto;

import com.ceramicerp.model.CheckDirection;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CheckRequest(
        @NotNull CheckDirection direction,
        Long customerId,
        Long supplierId,
        String partyName,
        @NotNull @DecimalMin(value = "0.001", message = "المبلغ يجب أن يكون أكبر من صفر") BigDecimal amount,
        String checkNumber,
        String bankName,
        @NotNull LocalDate dueDate,
        Long relatedSalesInvoiceId,
        Long relatedPurchaseInvoiceId,
        String notes
) {}
