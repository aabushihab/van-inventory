package com.ceramicerp.dto;

import java.math.BigDecimal;

public record StockItemDto(
        Long id,
        Long productId,
        String productName,
        String productSku,
        Long warehouseId,
        String warehouseName,
        BigDecimal quantity,
        BigDecimal minStockThreshold,
        boolean lowStock
) {}
