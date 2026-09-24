package com.vanerp.dto;

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
        BigDecimal unitsPerCarton,
        BigDecimal purchasePrice,
        BigDecimal salePrice,
        BigDecimal taxRate,
        BigDecimal minStockThreshold,
        String imageUrl,
        boolean active,
        BigDecimal totalStock
) {}
