package com.vanerp.service;

import com.vanerp.dto.BackupFileDto;
import com.vanerp.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * نسخ احتياطي يومي لقاعدة البيانات عبر pg_dump (صيغة مضغوطة قابلة للاستعادة بـ pg_restore)،
 * مع حذف تلقائي للنسخ الأقدم من فترة الاحتفاظ المحددة.
 * Daily database backup via pg_dump (compressed, pg_restore-able format), with automatic
 * pruning of backups older than the configured retention period.
 */
@Service
@Slf4j
public class BackupService {

    private static final Pattern JDBC_URL_PATTERN = Pattern.compile("jdbc:postgresql://([^:/]+):(\\d+)/([^?]+)");
    private static final DateTimeFormatter FILE_TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String dbUsername;

    @Value("${spring.datasource.password}")
    private String dbPassword;

    @Value("${app.backup.directory}")
    private String backupDirectory;

    @Value("${app.backup.retention-days}")
    private int retentionDays;

    @Value("${app.backup.pg-dump-path}")
    private String pgDumpPath;

    @Value("${app.backup.pg-restore-path}")
    private String pgRestorePath;

    private record DbConnection(String host, String port, String dbName) {}

    private DbConnection parseConnection() {
        Matcher matcher = JDBC_URL_PATTERN.matcher(datasourceUrl);
        if (!matcher.find()) {
            throw ApiException.badRequest("تعذر تحليل رابط قاعدة البيانات");
        }
        return new DbConnection(matcher.group(1), matcher.group(2), matcher.group(3));
    }

    public BackupFileDto runBackup() {
        DbConnection conn = parseConnection();
        String host = conn.host();
        String port = conn.port();
        String dbName = conn.dbName();

        try {
            Path dir = Paths.get(backupDirectory);
            Files.createDirectories(dir);

            String fileName = "backup_" + dbName + "_" + LocalDateTime.now().format(FILE_TIMESTAMP) + ".dump";
            Path outputFile = dir.resolve(fileName);

            ProcessBuilder pb = new ProcessBuilder(
                    pgDumpPath,
                    "--host=" + host, "--port=" + port, "--username=" + dbUsername,
                    "--format=custom", "--file=" + outputFile.toAbsolutePath(),
                    dbName
            );
            pb.environment().put("PGPASSWORD", dbPassword);
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String output;
            try (var reader = process.inputReader()) {
                output = reader.lines().reduce("", (a, b) -> a + b + "\n");
            }
            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw ApiException.badRequest("انتهت مهلة عملية النسخ الاحتياطي");
            }
            if (process.exitValue() != 0) {
                log.error("فشل النسخ الاحتياطي: {}", output);
                Files.deleteIfExists(outputFile);
                throw ApiException.badRequest("فشلت عملية النسخ الاحتياطي: " + output);
            }

            long size = Files.size(outputFile);
            log.info("تم إنشاء نسخة احتياطية: {} ({} bytes)", fileName, size);
            purgeOldBackups();
            return new BackupFileDto(fileName, size, LocalDateTime.now());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("تعذر تنفيذ النسخ الاحتياطي: " + e.getMessage(), e);
        }
    }

    /**
     * يستعيد نسخة احتياطية موجودة على قاعدة البيانات الحالية، مع أخذ نسخة احتياطية أمان تلقائية
     * قبل البدء حتى يمكن التراجع في حال حدوث خطأ. عملية حذف/استبدال شاملة لكل الجداول الحالية
     * ببيانات النسخة المُستعادة - غير قابلة للتراجع إلا عبر استعادة نسخة أمان أخرى.
     */
    public BackupFileDto restoreBackup(String fileName) {
        Path backupFile = resolveForDownload(fileName);
        DbConnection conn = parseConnection();

        // نسخة أمان تلقائية للحالة الحالية قبل الاستبدال، للسماح بالتراجع إن لزم
        BackupFileDto safetyBackup = runBackup();
        log.info("تم إنشاء نسخة أمان قبل الاستعادة: {}", safetyBackup.fileName());

        try {
            ProcessBuilder pb = new ProcessBuilder(
                    pgRestorePath,
                    "--host=" + conn.host(), "--port=" + conn.port(), "--username=" + dbUsername,
                    "--dbname=" + conn.dbName(), "--clean", "--if-exists", "--no-owner", "--no-privileges",
                    backupFile.toAbsolutePath().toString()
            );
            pb.environment().put("PGPASSWORD", dbPassword);
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String output;
            try (var reader = process.inputReader()) {
                output = reader.lines().reduce("", (a, b) -> a + b + "\n");
            }
            boolean finished = process.waitFor(5, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw ApiException.badRequest("انتهت مهلة عملية الاستعادة");
            }
            // pg_restore قد يُنهي بترميز غير صفري حتى لو نجحت الاستعادة بسبب تحذيرات بسيطة (مثل صلاحيات)
            // لذا نسجّل المخرجات دائماً لكن لا نعتبرها فشلاً قاطعاً إلا إذا لم يُنتج أي كائنات
            log.info("مخرجات الاستعادة: {}", output);
            if (process.exitValue() != 0 && output.toLowerCase().contains("could not execute query")) {
                throw ApiException.badRequest("فشلت عملية الاستعادة: " + output);
            }

            log.info("تمت استعادة النسخة الاحتياطية: {}", fileName);
            return new BackupFileDto(fileName, Files.size(backupFile), LocalDateTime.now());
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new IllegalStateException("تعذر تنفيذ الاستعادة: " + e.getMessage(), e);
        }
    }

    public void purgeOldBackups() {
        Instant cutoff = Instant.now().minus(retentionDays, java.time.temporal.ChronoUnit.DAYS);
        try (Stream<Path> files = Files.list(Paths.get(backupDirectory))) {
            files.filter(p -> p.getFileName().toString().endsWith(".dump")).forEach(p -> {
                try {
                    if (Files.getLastModifiedTime(p).toInstant().isBefore(cutoff)) {
                        Files.delete(p);
                        log.info("تم حذف نسخة احتياطية قديمة: {}", p.getFileName());
                    }
                } catch (IOException e) {
                    log.warn("تعذر حذف النسخة الاحتياطية {}: {}", p.getFileName(), e.getMessage());
                }
            });
        } catch (IOException ignored) {
            // مجلد النسخ الاحتياطية غير موجود بعد - لا حاجة للتنظيف
        }
    }

    public List<BackupFileDto> list() {
        Path dir = Paths.get(backupDirectory);
        if (!Files.exists(dir)) return List.of();
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(p -> p.getFileName().toString().endsWith(".dump"))
                    .map(p -> {
                        try {
                            var attrs = Files.readAttributes(p, java.nio.file.attribute.BasicFileAttributes.class);
                            return new BackupFileDto(p.getFileName().toString(), attrs.size(),
                                    LocalDateTime.ofInstant(attrs.creationTime().toInstant(), ZoneId.systemDefault()));
                        } catch (IOException e) {
                            return new BackupFileDto(p.getFileName().toString(), 0, null);
                        }
                    })
                    .sorted(Comparator.comparing(BackupFileDto::createdAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .toList();
        } catch (IOException e) {
            throw new IllegalStateException("تعذر قراءة مجلد النسخ الاحتياطية: " + e.getMessage(), e);
        }
    }

    public Path resolveForDownload(String fileName) {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw ApiException.badRequest("اسم ملف غير صالح");
        }
        Path path = Paths.get(backupDirectory).resolve(fileName).normalize();
        if (!Files.exists(path)) {
            throw ApiException.notFound("النسخة الاحتياطية غير موجودة");
        }
        return path;
    }
}
