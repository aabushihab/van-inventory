package com.ceramicerp.repository;

import com.ceramicerp.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:userId IS NULL OR a.user.id = :userId)
          AND (:entityType IS NULL OR a.entityType = :entityType)
          AND (:action IS NULL OR a.action = :action)
          AND a.createdAt >= :from
          AND a.createdAt < :to
          AND (:q IS NULL OR LOWER(a.description) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(a.username) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> search(@Param("userId") Long userId, @Param("entityType") String entityType,
                           @Param("action") String action, @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to, @Param("q") String q, Pageable pageable);

    @Query("SELECT DISTINCT a.entityType FROM AuditLog a ORDER BY a.entityType")
    java.util.List<String> findDistinctEntityTypes();

    long deleteByCreatedAtBefore(LocalDateTime cutoff);
}
