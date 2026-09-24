package com.ceramicerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ProductUpsertRequest(
        @NotBlank String sku,
        String barcode,
        @NotBlank String name,
        String nameEn,
        Long categoryId,
        @NotNull Long unitId,
        String size,
        String color,
        String originCountry,
        BigDecimal piecesPerBox,
        BigDecimal areaPerBox,
        @NotNull BigDecimal purchasePrice,
        @NotNull BigDecimal salePrice,
        BigDecimal taxRate,
        BigDecimal minStockThreshold,
        String imageUrl,
        Boolean active
) {}
