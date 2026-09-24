package com.vanerp.dto;

import java.math.BigDecimal;

public record InventoryValueDto(
        Long warehouseId,
        String warehouseName,
        Long productId,
        String productName,
        String sku,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal value
) {}
