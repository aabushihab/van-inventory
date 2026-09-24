package com.vanerp.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record StocktakeCountUpdateRequest(
        @NotEmpty List<LineCount> lines
) {
    public record LineCount(
            @NotNull Long productId,
            @NotNull BigDecimal countedQuantity
    ) {}
}
