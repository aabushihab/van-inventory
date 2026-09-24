package com.vanerp.dto;

import jakarta.validation.constraints.NotNull;

public record StocktakeCreateRequest(
        @NotNull Long warehouseId,
        String notes
) {}
