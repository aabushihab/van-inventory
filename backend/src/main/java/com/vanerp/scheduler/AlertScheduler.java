package com.vanerp.scheduler;

import com.vanerp.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * مواعيد فحص التنبيهات: انتهاء الأصناف صباحاً (وعند تشغيل النظام)، والسيارات مساءً بعد انتهاء يوم التوزيع.
 */
@Component
@RequiredArgsConstructor
public class AlertScheduler {

    private final AlertService alertService;

    @Scheduled(cron = "${app.alerts.expiry-cron:0 0 7 * * *}")
    public void expiry() {
        alertService.checkAllExpiry();
    }

    @Scheduled(cron = "${app.alerts.van-cron:0 0 20 * * *}")
    public void vans() {
        alertService.checkVans();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        alertService.checkAllExpiry();
    }
}
