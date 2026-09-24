package com.ceramicerp.dto;

import com.ceramicerp.model.CheckDirection;
import com.ceramicerp.model.CheckStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record CheckDto(
        Long id,
        CheckDirection direction,
        Long customerId,
        String customerName,
        Long supplierId,
        String supplierName,
        String partyName,
        BigDecimal amount,
        String checkNumber,
        String bankName,
        LocalDate dueDate,
        CheckStatus status,
        Long accountId,
        String accountName,
        Long relatedSalesInvoiceId,
        Long relatedPurchaseInvoiceId,
        String notes,
        String createdByName,
        LocalDateTime createdAt
) {}
