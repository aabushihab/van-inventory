package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PurchaseInvoiceDto(
        Long id,
        String invoiceNumber,
        Long supplierId,
        String supplierName,
        String supplierTaxNumber,
        Long warehouseId,
        String warehouseName,
        Long branchId,
        String branchName,
        String status,
        BigDecimal subtotal,
        BigDecimal taxTotal,
        BigDecimal discountTotal,
        BigDecimal grandTotal,
        BigDecimal paidAmount,
        BigDecimal dueAmount,
        BigDecimal creditOwed,
        String notes,
        LocalDate dueDate,
        String createdByName,
        LocalDateTime createdAt,
        List<InvoiceItemDto> items
) {}
