package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySalesPointDto(
        LocalDate date,
        BigDecimal total
) {}
