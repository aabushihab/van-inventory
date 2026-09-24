package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record SalesInvoiceDto(
        Long id,
        String invoiceNumber,
        Long customerId,
        String customerName,
        String customerTaxNumber,
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
        String paymentMethod,
        String notes,
        LocalDate dueDate,
        String createdByName,
        LocalDateTime createdAt,
        List<InvoiceItemDto> items
) {}
