package com.ceramicerp.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FixedAssetDisposeRequest(
        @NotNull LocalDate disposedDate,
        BigDecimal saleAmount,
        Long accountId,
        String notes
) {}
