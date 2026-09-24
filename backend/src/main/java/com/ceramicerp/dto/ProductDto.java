package com.ceramicerp.dto;

import java.math.BigDecimal;

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
        String size,
        String color,
        String originCountry,
        BigDecimal piecesPerBox,
        BigDecimal areaPerBox,
        BigDecimal purchasePrice,
        BigDecimal salePrice,
        BigDecimal taxRate,
        BigDecimal minStockThreshold,
        String imageUrl,
        boolean active,
        BigDecimal totalStock
) {}
