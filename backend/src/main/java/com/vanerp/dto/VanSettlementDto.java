package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** تقرير سيارة التوزيع/السائق لفترة: حركة البضاعة لكل صنف، فواتير البيع، والحمولة الحالية. */
public record VanSettlementDto(
        Long vanId,
        String vanName,
        String salesmanName,
        String driverName,
        String plateNumber,
        LocalDate from,
        LocalDate to,
        long invoiceCount,
        BigDecimal salesTotal,
        BigDecimal collectedAmount,
        BigDecimal creditAmount,
        BigDecimal closingStockValue,
        List<VanSettlementLineDto> lines,
        List<VanInvoiceRowDto> invoices,
        BigDecimal currentStockQuantity,
        BigDecimal currentStockValue,
        List<VanStockRowDto> currentStock
) {}
