package com.vanerp.scheduler;

import com.vanerp.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * تنظيف دوري يومي لسجل التدقيق: يحذف السجلات الأقدم من فترة الاحتفاظ المحددة (شهر افتراضياً)
 * حتى لا يتضخم الجدول إلى ما لا نهاية.
 * Daily cleanup of the audit log: purges entries older than the configured retention period
 * (default one month) so the table doesn't grow unbounded.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditLogRetentionScheduler {

    private final AuditLogService auditLogService;

    @Value("${app.audit-log.retention-days:30}")
    private int retentionDays;

    @Scheduled(cron = "${app.audit-log.purge-cron:0 0 3 * * *}")
    public void purgeOldLogs() {
        long deleted = auditLogService.purgeOlderThan(retentionDays);
        if (deleted > 0) {
            log.info("تنظيف سجل التدقيق: تم حذف {} سجل أقدم من {} يوم", deleted, retentionDays);
        }
    }
}
