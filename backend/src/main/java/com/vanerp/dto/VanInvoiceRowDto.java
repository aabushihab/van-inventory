package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** سطر فاتورة بيع في تقرير السيارة/السائق. */
public record VanInvoiceRowDto(
        Long id,
        String invoiceNumber,
        LocalDateTime createdAt,
        String customerName,
        String status,
        BigDecimal quantity,
        BigDecimal grandTotal,
        BigDecimal paidAmount,
        BigDecimal dueAmount,
        String createdByName
) {}
