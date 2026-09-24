package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductDto(
        Long id,
        String sku,
        String barcode,
        String name,
        String nameEn,
        Long categoryId,
        String categoryName,
        Long unitId,
        String unitName,
        BigDecimal unitsPerCarton,
        BigDecimal cartonPrice,
        BigDecimal minSalePrice,
        BigDecimal maxSalePrice,
        BigDecimal purchasePrice,
        BigDecimal salePrice,
        BigDecimal taxRate,
        BigDecimal minStockThreshold,
        String imageUrl,
        LocalDate expiryDate,
        Integer expiryAlertDays,
        /** EXPIRED | SOON | OK | null (بدون تاريخ انتهاء) */
        String expiryStatus,
        Long daysToExpiry,
        boolean active,
        BigDecimal totalStock
) {}
