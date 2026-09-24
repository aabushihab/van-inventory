package com.ceramicerp.service;

import com.ceramicerp.dto.DailySalesPointDto;
import com.ceramicerp.dto.DashboardSummaryDto;
import com.ceramicerp.model.InvoiceStatus;
import com.ceramicerp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final SalesReturnRepository salesReturnRepository;
    private final StockItemRepository stockItemRepository;
    private final NotificationRepository notificationRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final BranchRepository branchRepository;

    public DashboardSummaryDto summary() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime now = LocalDateTime.now();

        // صافي المبيعات = إجمالي الفواتير (بما فيها المرتجعة بالكامل) ناقص قيمة كل مرتجعات نفس الفترة،
        // بنفس منهجية التقرير المالي - بدون هذا الخصم كان الرقم يظهر أعلى من الحقيقة عند وجود مرتجعات.
        BigDecimal todaySales = salesInvoiceRepository.sumGrandTotalSince(startOfDay)
                .subtract(salesReturnRepository.sumTotalValueByCreatedAtBetween(startOfDay, now));
        BigDecimal monthSales = salesInvoiceRepository.sumGrandTotalSince(startOfMonth)
                .subtract(salesReturnRepository.sumTotalValueByCreatedAtBetween(startOfMonth, now));
        long todayInvoicesCount = salesInvoiceRepository.countByCreatedAtAfterAndStatus(startOfDay, InvoiceStatus.CONFIRMED);
        long lowStockCount = stockItemRepository.findLowStockItems().size();
        long unread = notificationRepository.countByReadFalse();

        return new DashboardSummaryDto(
                todaySales, todayInvoicesCount, monthSales, lowStockCount, unread,
                productRepository.count(), warehouseRepository.count(), branchRepository.count(),
                last7DaysSales()
        );
    }

    /** صافي مبيعات كل يوم من آخر 7 أيام (بما فيها اليوم الحالي)، لعرضها كرسم بياني بلوحة التحكم. */
    private List<DailySalesPointDto> last7DaysSales() {
        List<DailySalesPointDto> points = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            LocalDateTime dayStart = day.atStartOfDay();
            LocalDateTime dayEnd = dayStart.plusDays(1);
            BigDecimal net = salesInvoiceRepository.sumGrandTotalBetween(dayStart, dayEnd)
                    .subtract(salesReturnRepository.sumTotalValueByCreatedAtBetween(dayStart, dayEnd));
            points.add(new DailySalesPointDto(day, net));
        }
        return points;
    }
}
