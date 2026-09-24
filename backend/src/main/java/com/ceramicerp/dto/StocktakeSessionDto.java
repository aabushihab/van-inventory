package com.ceramicerp.dto;

import com.ceramicerp.model.StocktakeStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record StocktakeSessionDto(
        Long id,
        Long warehouseId,
        String warehouseName,
        LocalDate sessionDate,
        StocktakeStatus status,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime completedAt,
        List<StocktakeLineDto> lines
) {}
