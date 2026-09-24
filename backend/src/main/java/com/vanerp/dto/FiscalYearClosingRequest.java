package com.vanerp.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record FiscalYearClosingRequest(
        @NotNull LocalDate closingDate,
        String notes
) {}
