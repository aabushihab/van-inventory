package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EInvoiceSubmissionDto(
        Long id,
        String docType,
        Long salesInvoiceId,
        String invoiceNumber,
        String docNumber,
        String customerName,
        BigDecimal invoiceTotal,
        String uuid,
        Long icv,
        boolean cash,
        String status,
        boolean retryable,
        int attempts,
        String lastError,
        boolean hasQr,
        String reason,
        LocalDateTime lastAttemptAt,
        LocalDateTime sentAt,
        LocalDateTime createdAt
) {}
