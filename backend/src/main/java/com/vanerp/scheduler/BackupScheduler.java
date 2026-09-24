package com.vanerp.scheduler;

import com.vanerp.dto.BackupFileDto;
import com.vanerp.service.BackupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** يُطلق نسخة احتياطية يومية لقاعدة البيانات في الوقت المحدد (10 مساءً افتراضياً). */
@Component
@RequiredArgsConstructor
@Slf4j
public class BackupScheduler {

    private final BackupService backupService;

    @Value("${app.backup.enabled:true}")
    private boolean enabled;

    @Scheduled(cron = "${app.backup.cron:0 0 22 * * *}")
    public void runScheduledBackup() {
        if (!enabled) return;
        try {
            BackupFileDto backup = backupService.runBackup();
            log.info("اكتملت النسخة الاحتياطية اليومية: {}", backup.fileName());
        } catch (Exception e) {
            log.error("فشلت النسخة الاحتياطية اليومية المجدولة: {}", e.getMessage(), e);
        }
    }
}
