package com.ceramicerp.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryDto(
        BigDecimal todaySales,
        long todayInvoicesCount,
        BigDecimal monthSales,
        long lowStockCount,
        long unreadNotificationsCount,
        long totalProducts,
        long totalWarehouses,
        long totalBranches,
        List<DailySalesPointDto> last7DaysSales
) {}
