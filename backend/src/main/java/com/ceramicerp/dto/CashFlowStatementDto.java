package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CashFlowStatementDto(
        LocalDate from,
        LocalDate to,
        BigDecimal operatingNet,
        BigDecimal investingNet,
        BigDecimal financingNet,
        BigDecimal netChange,
        BigDecimal openingCash,
        BigDecimal closingCash
) {}
