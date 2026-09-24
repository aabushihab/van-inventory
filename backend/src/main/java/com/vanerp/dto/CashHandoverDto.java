package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CashHandoverDto(
        Long id,
        Long vanId,
        String vanName,
        String driverName,
        BigDecimal expectedAmount,
        BigDecimal handedAmount,
        BigDecimal difference,
        String toAccountName,
        Long shortageId,
        String notes,
        String createdByName,
        LocalDateTime createdAt
) {}
