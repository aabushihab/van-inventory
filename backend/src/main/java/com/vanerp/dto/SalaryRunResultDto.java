package com.vanerp.dto;

import java.math.BigDecimal;
import java.util.List;

public record SalaryRunResultDto(
        int paidCount,
        BigDecimal totalPaid,
        List<SalaryRunLineDto> lines
) {}
