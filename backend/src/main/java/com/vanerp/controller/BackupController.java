package com.vanerp.controller;

import com.vanerp.dto.BackupFileDto;
import com.vanerp.service.BackupService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/backups")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_MANAGE')")
public class BackupController {

    private final BackupService backupService;

    @GetMapping
    public List<BackupFileDto> list() {
        return backupService.list();
    }

    @PostMapping("/run")
    public BackupFileDto runNow() {
        return backupService.runBackup();
    }

    /**
     * يُنزّل سكربت SQL جاهز لتصفير كل بيانات النظام (بترتيب آمن يراعي المفاتيح الأجنبية)، للاستخدام
     * اليدوي المتعمَّد فقط (مثلاً تنظيف تثبيت جديد من بيانات تجريبية) - لا يُنفَّذ تلقائياً من النظام.
     */
    @GetMapping("/reset-script")
    public ResponseEntity<Resource> downloadResetScript() {
        Resource resource = new ClassPathResource("scripts/reset-data.sql");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/sql"));
        headers.setContentDisposition(ContentDisposition.attachment()
                .filename("reset-data.sql", StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    @GetMapping("/{fileName}/download")
    public ResponseEntity<FileSystemResource> download(@PathVariable String fileName) {
        Path path = backupService.resolveForDownload(fileName);
        FileSystemResource resource = new FileSystemResource(path);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", fileName);
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    /**
     * يستعيد نسخة احتياطية على قاعدة البيانات الحالية (يستبدل كل البيانات الحالية). يأخذ نسخة أمان
     * تلقائية قبل البدء. عملية حساسة - مقصورة على صلاحية إدارة النظام فقط.
     */
    @PostMapping("/{fileName}/restore")
    public BackupFileDto restore(@PathVariable String fileName) {
        return backupService.restoreBackup(fileName);
    }
}
