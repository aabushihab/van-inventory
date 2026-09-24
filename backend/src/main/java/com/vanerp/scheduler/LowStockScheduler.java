package com.vanerp.scheduler;

import com.vanerp.model.StockItem;
import com.vanerp.repository.StockItemRepository;
import com.vanerp.repository.UserRepository;
import com.vanerp.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * فحص دوري لمستويات المخزون: يولّد تنبيهات نظام لكل منتج/مخزن وصل لحده الأدنى،
 * ويرسل بريداً إلكترونياً ملخصاً إذا كان مفعّلاً بإعدادات التطبيق.
 * Periodic low-stock scan: raises in-app notifications and an optional summary email.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LowStockScheduler {

    private final StockItemRepository stockItemRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    @Value("${app.low-stock.notify-email-enabled:false}")
    private boolean emailEnabled;

    @Scheduled(cron = "${app.low-stock.check-cron:0 0 * * * *}")
    public void checkLowStock() {
        List<StockItem> lowStockItems = stockItemRepository.findLowStockItems();
        log.info("فحص نقصان المخزون: تم العثور على {} عنصر تحت الحد الأدنى", lowStockItems.size());

        for (StockItem item : lowStockItems) {
            notificationService.raiseLowStockAlertIfNeeded(item.getProduct(), item.getWarehouse(), item.getQuantity());
        }

        if (emailEnabled && !lowStockItems.isEmpty()) {
            sendDigestEmail(lowStockItems);
        }
    }

    private void sendDigestEmail(List<StockItem> items) {
        List<String> recipients = userRepository.findAll().stream()
                .filter(u -> u.isActive() && u.getEmail() != null && !u.getEmail().isBlank())
                .filter(u -> u.getRole().getPermissions().stream().anyMatch(p -> p.getCode().equals("NOTIFICATION_VIEW")))
                .map(u -> u.getEmail())
                .distinct()
                .collect(Collectors.toList());

        if (recipients.isEmpty()) return;

        StringBuilder body = new StringBuilder("تقرير نقصان المخزون:\n\n");
        for (StockItem item : items) {
            body.append(String.format("- %s | المخزن: %s | الكمية: %s | الحد الأدنى: %s%n",
                    item.getProduct().getName(), item.getWarehouse().getName(),
                    item.getQuantity().stripTrailingZeros().toPlainString(),
                    item.getProduct().getMinStockThreshold().stripTrailingZeros().toPlainString()));
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipients.toArray(new String[0]));
            message.setSubject("تنبيه: منتجات وصلت للحد الأدنى من المخزون");
            message.setText(body.toString());
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("تعذر إرسال بريد تنبيه نقصان المخزون: {}", e.getMessage());
        }
    }
}
