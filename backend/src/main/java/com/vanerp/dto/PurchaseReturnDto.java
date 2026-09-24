package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseReturnDto(
        Long id,
        Long purchaseInvoiceId,
        String invoiceNumber,
        String returnNumber,
        BigDecimal totalValue,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        List<PurchaseReturnItemDto> items
) {}
