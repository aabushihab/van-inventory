package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record VanLoadDto(
        Long id,
        String loadNumber,
        Long vanId,
        String vanName,
        Long warehouseId,
        String warehouseName,
        String loadType,
        String status,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime cancelledAt,
        BigDecimal totalQuantity,
        List<VanLoadItemDto> items
) {}
