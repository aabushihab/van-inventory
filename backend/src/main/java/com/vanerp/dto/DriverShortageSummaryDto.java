package com.vanerp.dto;

import java.math.BigDecimal;

/** ملخص عجز سائق: عدد وقيمة المستحق، وإجمالي كل العجوزات المسجّلة عليه. */
public record DriverShortageSummaryDto(
        Long driverId,
        String driverName,
        long pendingCount,
        BigDecimal pendingValue,
        long totalCount,
        BigDecimal totalValue
) {}
