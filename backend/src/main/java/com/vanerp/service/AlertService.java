package com.vanerp.service;

import com.vanerp.model.*;
import com.vanerp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * تنبيهات فعلية تُنشأ كإشعارات في النظام:
 * - انتهاء الأصناف: قبل تاريخ الانتهاء بعدد أيام محدد لكل صنف (أو الافتراضي)، وعند الانتهاء فعلاً.
 * - السيارات: لم تُحمَّل منذ فترة، أو عليها بضاعة لم تُنزَّل منذ فترة.
 * كل حدث له مفتاح فريد (alert_key) فلا يتكرر: تنبيه الانتهاء مرة واحدة لكل تاريخ، وتنبيه السيارة مرة يومياً.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final ProductRepository productRepository;
    private final StockItemRepository stockItemRepository;
    private final VanRepository vanRepository;
    private final VanLoadRepository vanLoadRepository;
    private final NotificationRepository notificationRepository;
    private final CompanySettingsService companySettingsService;

    /** يفحص صنفاً واحداً (يُستدعى عند حفظ الصنف ومن الفحص اليومي). يعيد true إن أُنشئ تنبيه جديد. */
    @Transactional
    public boolean checkProductExpiry(Product product) {
        CompanySettings settings = companySettingsService.getOrCreate();
        if (!settings.isExpiryAlertsEnabled() || !product.isActive() || product.getExpiryDate() == null) return false;

        LocalDate expiry = product.getExpiryDate();
        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), expiry);
        int alertDays = product.getExpiryAlertDays() != null ? product.getExpiryAlertDays() : settings.getDefaultExpiryAlertDays();
        String qty = stockItemRepository.findByProductId(product.getId()).stream()
                .map(StockItem::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add)
                .stripTrailingZeros().toPlainString();

        if (daysLeft < 0) {
            return raise("EXPIRED:" + product.getId() + ":" + expiry, NotificationType.EXPIRED,
                    "صنف منتهي الصلاحية: " + product.getName(),
                    String.format("انتهت صلاحية \"%s\" بتاريخ %s (منذ %d يوم). الكمية الموجودة بالمخازن: %s.",
                            product.getName(), expiry, -daysLeft, qty),
                    product, null);
        }
        if (daysLeft <= alertDays) {
            return raise("EXPIRY_SOON:" + product.getId() + ":" + expiry, NotificationType.EXPIRY_SOON,
                    "صنف قارب على الانتهاء: " + product.getName(),
                    String.format("تنتهي صلاحية \"%s\" بتاريخ %s (بعد %d يوم). الكمية الموجودة بالمخازن: %s.",
                            product.getName(), expiry, daysLeft, qty),
                    product, null);
        }
        return false;
    }

    /** الفحص اليومي لكل الأصناف التي لها تاريخ انتهاء. يعيد عدد التنبيهات الجديدة. */
    @Transactional
    public int checkAllExpiry() {
        int created = 0;
        for (Product p : productRepository.findByActiveTrueAndExpiryDateIsNotNull()) {
            if (checkProductExpiry(p)) created++;
        }
        log.info("فحص انتهاء الأصناف: {} تنبيه جديد", created);
        return created;
    }

    /** فحص السيارات: لم تُحمَّل منذ X يوم، أو عليها بضاعة لم تُنزَّل منذ Y يوم. يعيد عدد التنبيهات الجديدة. */
    @Transactional
    public int checkVans() {
        CompanySettings settings = companySettingsService.getOrCreate();
        if (!settings.isVanAlertsEnabled()) return 0;
        LocalDate today = LocalDate.now();
        int created = 0;

        for (Van van : vanRepository.findAll()) {
            if (!van.isActive()) continue;

            // لم تُحمَّل: منذ آخر تحميل (أو منذ إضافة السيارة إن لم تُحمَّل أبداً)
            LocalDateTime lastLoad = vanLoadRepository.lastOf(van.getId(), VanLoadType.LOAD);
            LocalDate loadRef = (lastLoad != null ? lastLoad : van.getCreatedAt()).toLocalDate();
            long daysSinceLoad = ChronoUnit.DAYS.between(loadRef, today);
            if (daysSinceLoad >= settings.getVanNoLoadAlertDays()) {
                String since = lastLoad != null ? "آخر تحميل كان بتاريخ " + loadRef : "لم تُحمَّل أبداً منذ إضافتها بتاريخ " + loadRef;
                if (raise("VAN_NOT_LOADED:" + van.getId() + ":" + today, NotificationType.VAN_NOT_LOADED,
                        "سيارة لم تُحمَّل: " + van.getName(),
                        String.format("السيارة \"%s\" (%s) لم تُحمَّل منذ %d يوم - %s.%s",
                                van.getName(), van.getPlateNumber(), daysSinceLoad, since, driverSuffix(van)),
                        null, van.getWarehouse())) created++;
            }

            // لم تُنزَّل: عليها بضاعة منذ أول تحميل بعد آخر تنزيل
            BigDecimal onVan = stockItemRepository.findByWarehouseId(van.getWarehouse().getId()).stream()
                    .map(StockItem::getQuantity).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (onVan.signum() > 0) {
                LocalDateTime lastUnload = vanLoadRepository.lastOf(van.getId(), VanLoadType.UNLOAD);
                LocalDateTime goodsSince = vanLoadRepository.firstLoadAfter(van.getId(),
                        lastUnload != null ? lastUnload : LocalDateTime.of(2000, 1, 1, 0, 0));
                if (goodsSince != null) {
                    long days = ChronoUnit.DAYS.between(goodsSince.toLocalDate(), today);
                    if (days >= settings.getVanNoUnloadAlertDays()) {
                        if (raise("VAN_NOT_UNLOADED:" + van.getId() + ":" + today, NotificationType.VAN_NOT_UNLOADED,
                                "سيارة لم تُنزَّل: " + van.getName(),
                                String.format("على السيارة \"%s\" (%s) بضاعة (%s وحدة) منذ %d يوم دون تنزيل أو جرد - منذ %s.%s",
                                        van.getName(), van.getPlateNumber(), onVan.stripTrailingZeros().toPlainString(),
                                        days, goodsSince.toLocalDate(), driverSuffix(van)),
                                null, van.getWarehouse())) created++;
                    }
                }
            }
        }
        log.info("فحص السيارات: {} تنبيه جديد", created);
        return created;
    }

    private String driverSuffix(Van van) {
        String driver = van.getDriver() != null ? van.getDriver().getName() : van.getDriverName();
        return driver != null ? " السائق: " + driver + "." : "";
    }

    private boolean raise(String key, NotificationType type, String title, String message, Product product, Warehouse warehouse) {
        if (notificationRepository.existsByAlertKey(key)) return false;
        notificationRepository.save(Notification.builder()
                .type(type).title(title).message(message)
                .relatedProduct(product).relatedWarehouse(warehouse)
                .alertKey(key).read(false).build());
        return true;
    }
}
