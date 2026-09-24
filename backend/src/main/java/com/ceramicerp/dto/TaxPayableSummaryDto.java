package com.ceramicerp.dto;

import java.math.BigDecimal;

public record TaxPayableSummaryDto(
        BigDecimal taxCollected,
        BigDecimal taxPaid,
        BigDecimal netPayable
) {}
