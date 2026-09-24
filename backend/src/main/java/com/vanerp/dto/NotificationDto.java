package com.vanerp.dto;

import java.time.LocalDateTime;

public record NotificationDto(
        Long id,
        String type,
        String title,
        String message,
        Long relatedProductId,
        String relatedProductName,
        Long relatedWarehouseId,
        String relatedWarehouseName,
        Long relatedSalesInvoiceId,
        String relatedSalesInvoiceNumber,
        Long relatedPurchaseInvoiceId,
        String relatedPurchaseInvoiceNumber,
        boolean read,
        LocalDateTime createdAt
) {}
