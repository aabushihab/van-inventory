package com.vanerp.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record FiscalYearClosingDto(
        Long id,
        LocalDate closingDate,
        String notes,
        String closedByName,
        LocalDateTime closedAt
) {}
