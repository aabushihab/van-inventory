package com.vanerp.dto;

import java.math.BigDecimal;

/**
 * ملخص مالي لفترة واحدة (يوم أو شهر): المبيعات، تكلفة البضاعة المباعة، الربح، المشتريات، وخسارة التوالف
 * غير المعوَّضة (تُخصم من الربح لأنها بضاعة خرجت من المخزون بلا مقابل).
 * Financial summary for a single period (day or month): sales, cost of goods sold, profit, purchases,
 * and uncompensated damaged-goods loss (deducted from profit since it left inventory with no return).
 */
public record FinancialPeriodDto(
        String period,
        long salesCount,
        BigDecimal salesTotal,
        BigDecimal discountTotal,
        BigDecimal costOfGoodsSold,
        BigDecimal damagedLoss,
        BigDecimal expensesTotal,
        BigDecimal grossProfit,
        BigDecimal purchasesTotal
) {}
