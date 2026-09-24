package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SalesReturnDto(
        Long id,
        Long salesInvoiceId,
        String invoiceNumber,
        String returnNumber,
        BigDecimal totalValue,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        List<SalesReturnItemDto> items
) {}
