package com.vanerp.dto;

import com.vanerp.model.FixedAssetStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record FixedAssetDto(
        Long id,
        String name,
        String category,
        LocalDate purchaseDate,
        BigDecimal purchaseCost,
        BigDecimal salvageValue,
        Integer usefulLifeMonths,
        Long accountId,
        String accountName,
        Long branchId,
        String branchName,
        FixedAssetStatus status,
        LocalDate disposedDate,
        String notes,
        long monthsElapsed,
        BigDecimal accumulatedDepreciation,
        BigDecimal netBookValue,
        String createdByName,
        LocalDateTime createdAt
) {}
