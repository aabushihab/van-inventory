package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockMovementDto(
        Long id,
        Long productId,
        String productName,
        Long warehouseId,
        String warehouseName,
        String movementType,
        BigDecimal quantity,
        BigDecimal balanceAfter,
        String referenceType,
        Long referenceId,
        String note,
        String createdByName,
        LocalDateTime createdAt
) {}
