package com.vanerp.scheduler;

import com.vanerp.model.PurchaseInvoice;
import com.vanerp.model.SalesInvoice;
import com.vanerp.repository.PurchaseInvoiceRepository;
import com.vanerp.repository.SalesInvoiceRepository;
import com.vanerp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * فحص دوري لفواتير البيع والشراء غير المسدَّدة بالكامل: يولّد تنبيه نظام لكل فاتورة تجاوزت تاريخ استحقاقها.
 * Periodic overdue-invoice scan: raises an in-app notification for every unpaid invoice past its due date.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OverdueInvoiceScheduler {

    private final SalesInvoiceRepository salesInvoiceRepository;
    private final PurchaseInvoiceRepository purchaseInvoiceRepository;
    private final NotificationService notificationService;

    @Scheduled(cron = "${app.overdue-invoices.check-cron:0 0 * * * *}")
    public void checkOverdueInvoices() {
        LocalDate today = LocalDate.now();

        List<SalesInvoice> overdueSales = salesInvoiceRepository.findOverdue(today);
        log.info("فحص تأخر سداد فواتير البيع: تم العثور على {} فاتورة متأخرة", overdueSales.size());
        for (SalesInvoice invoice : overdueSales) {
            long daysOverdue = ChronoUnit.DAYS.between(invoice.getDueDate(), today);
            var dueAmount = invoice.getGrandTotal().subtract(invoice.getPaidAmount());
            notificationService.raiseOverdueSalesInvoiceAlertIfNeeded(invoice, daysOverdue, dueAmount);
        }

        List<PurchaseInvoice> overduePurchases = purchaseInvoiceRepository.findOverdue(today);
        log.info("فحص تأخر سداد فواتير الشراء: تم العثور على {} فاتورة متأخرة", overduePurchases.size());
        for (PurchaseInvoice invoice : overduePurchases) {
            long daysOverdue = ChronoUnit.DAYS.between(invoice.getDueDate(), today);
            var dueAmount = invoice.getGrandTotal().subtract(invoice.getPaidAmount());
            notificationService.raiseOverduePurchaseInvoiceAlertIfNeeded(invoice, daysOverdue, dueAmount);
        }
    }
}
