package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseQuoteDto(
        Long id,
        String quoteNumber,
        Long supplierId,
        String supplierName,
        Long warehouseId,
        String warehouseName,
        Long branchId,
        String branchName,
        String status,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal discountTotal,
        BigDecimal grandTotal,
        String notes,
        Long convertedInvoiceId,
        String convertedInvoiceNumber,
        String createdByName,
        LocalDateTime createdAt,
        List<QuoteItemDto> items
) {}
