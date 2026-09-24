package com.ceramicerp.service;

import com.ceramicerp.dto.AuditLogDto;
import com.ceramicerp.model.AuditLog;
import com.ceramicerp.repository.AuditLogRepository;
import com.ceramicerp.repository.UserRepository;
import com.ceramicerp.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * سجل تدقيق يسجّل كل العمليات المهمة (إضافة/تعديل/حذف) وأي مستخدم قام بها، لأغراض المراقبة والمساءلة.
 * Audit trail recording important mutations (create/update/delete) and who performed them.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void record(String httpMethod, String action, String entityType, String path, String description) {
        record(httpMethod, action, entityType, path, description, null);
    }

    @Transactional
    public void record(String httpMethod, String action, String entityType, String path, String description,
                        String explicitUsername) {
        Long userId = null;
        String username = "system";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            userId = principal.getId();
            username = principal.getUsername();
        } else if (explicitUsername != null) {
            username = explicitUsername;
            userId = userRepository.findByUsername(explicitUsername).map(u -> u.getId()).orElse(null);
        }

        AuditLog log = AuditLog.builder()
                .user(userId != null ? userRepository.getReferenceById(userId) : null)
                .username(username)
                .httpMethod(httpMethod)
                .action(action)
                .entityType(entityType)
                .path(path)
                .description(description)
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public Page<AuditLogDto> search(Long userId, String entityType, String action,
                                     LocalDateTime from, LocalDateTime to, String q, Pageable pageable) {
        return auditLogRepository.search(userId, entityType, action, from, to, q, pageable).map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<String> entityTypes() {
        return auditLogRepository.findDistinctEntityTypes();
    }

    /** يحذف سجلات التدقيق الأقدم من عدد الأيام المحدد (تنظيف دوري تلقائي). */
    @Transactional
    public long purgeOlderThan(int days) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        return auditLogRepository.deleteByCreatedAtBefore(cutoff);
    }

    private AuditLogDto toDto(AuditLog a) {
        return new AuditLogDto(a.getId(), a.getUsername(), a.getHttpMethod(), a.getAction(),
                a.getEntityType(), a.getPath(), a.getDescription(), a.getCreatedAt());
    }
}
