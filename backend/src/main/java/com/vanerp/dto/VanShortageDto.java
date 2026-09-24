package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record VanShortageDto(
        Long id,
        Long vanId,
        String vanName,
        String plateNumber,
        Long driverId,
        String driverName,
        String shortageType,
        String pricing,
        BigDecimal totalValue,
        String status,
        Integer salaryYear,
        Integer salaryMonth,
        String accountName,
        String settlementNote,
        LocalDateTime settledAt,
        String settledByName,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        List<VanShortageItemDto> items
) {}
