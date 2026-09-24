package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ProductUpsertRequest(
        @NotBlank String sku,
        String barcode,
        @NotBlank String name,
        String nameEn,
        Long categoryId,
        @NotNull Long unitId,
        BigDecimal unitsPerCarton,
        BigDecimal cartonPrice,
        BigDecimal minSalePrice,
        BigDecimal maxSalePrice,
        @NotNull BigDecimal purchasePrice,
        @NotNull BigDecimal salePrice,
        BigDecimal taxRate,
        BigDecimal minStockThreshold,
        String imageUrl,
        LocalDate expiryDate,
        @Min(value = 0, message = "أيام التنبيه لا يمكن أن تكون سالبة") Integer expiryAlertDays,
        Boolean active
) {}
