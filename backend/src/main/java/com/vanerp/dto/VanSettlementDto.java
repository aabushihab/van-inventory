package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** تسوية سيارة توزيع لفترة: حركة البضاعة لكل صنف + ملخص المبيعات والتحصيل. */
public record VanSettlementDto(
        Long vanId,
        String vanName,
        String salesmanName,
        LocalDate from,
        LocalDate to,
        long invoiceCount,
        BigDecimal salesTotal,
        BigDecimal collectedAmount,
        BigDecimal creditAmount,
        BigDecimal closingStockValue,
        List<VanSettlementLineDto> lines
) {}
