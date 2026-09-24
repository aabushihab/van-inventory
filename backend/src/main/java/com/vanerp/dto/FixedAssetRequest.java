package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedAssetRequest(
        @NotBlank String name,
        String category,
        @NotNull LocalDate purchaseDate,
        @NotNull @Positive BigDecimal purchaseCost,
        BigDecimal salvageValue,
        @NotNull @Positive Integer usefulLifeMonths,
        Long accountId,
        Long branchId,
        String notes
) {}
