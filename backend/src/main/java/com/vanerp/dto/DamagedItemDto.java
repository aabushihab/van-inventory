package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record DamagedItemDto(
        Long id,
        Long productId,
        String productName,
        String sku,
        Long warehouseId,
        String warehouseName,
        BigDecimal originalQuantity,
        BigDecimal compensatedQuantity,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal lostValue,
        String status,
        String reason,
        String createdByName,
        LocalDateTime createdAt
) {}
