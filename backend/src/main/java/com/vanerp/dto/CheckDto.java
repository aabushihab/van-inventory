package com.vanerp.dto;

import com.vanerp.model.CheckDirection;
import com.vanerp.model.CheckStatus;

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
        LocalDateTime createdAt,
        String relatedSalesInvoiceNumber,
        String vanName,
        boolean hasImage
) {}
