package com.vanerp.dto;

import java.math.BigDecimal;

/** سطر معاينة صرف رواتب شهر: الراتب، المستلم، خصم العجز، والمتبقي الذي سيُصرف. */
public record SalaryRunLineDto(
        Long employeeId,
        String name,
        String position,
        BigDecimal monthlySalary,
        BigDecimal paid,
        BigDecimal shortageDeduction,
        BigDecimal remaining
) {}
