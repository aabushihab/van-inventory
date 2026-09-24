package com.vanerp.repository;

import com.vanerp.model.ShortageStatus;
import com.vanerp.model.VanShortage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface VanShortageRepository extends JpaRepository<VanShortage, Long> {

    @Query("""
        SELECT s FROM VanShortage s
        WHERE (:vanId IS NULL OR s.van.id = :vanId)
          AND (:driverId IS NULL OR s.driver.id = :driverId)
          AND (:status IS NULL OR s.status = :status)
          AND s.createdAt >= :from AND s.createdAt < :to
        ORDER BY s.createdAt DESC
        """)
    Page<VanShortage> search(@Param("vanId") Long vanId, @Param("driverId") Long driverId,
                             @Param("status") ShortageStatus status,
                             @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    /** مجموع العجز المستحق (غير المحسوم) على سيارة. */
    @Query("SELECT COALESCE(SUM(s.totalValue), 0) FROM VanShortage s WHERE s.van.id = :vanId AND s.status = com.vanerp.model.ShortageStatus.PENDING")
    BigDecimal pendingValueByVan(@Param("vanId") Long vanId);

    List<VanShortage> findByStatusAndSalaryYearAndSalaryMonth(ShortageStatus status, Integer salaryYear, Integer salaryMonth);

    List<VanShortage> findAllByOrderByCreatedAtDesc();
}
