package com.vanerp.repository;

import com.vanerp.model.VanLoad;
import com.vanerp.model.VanLoadType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface VanLoadRepository extends JpaRepository<VanLoad, Long> {

    @Query("""
        SELECT l FROM VanLoad l
        WHERE (:vanId IS NULL OR l.van.id = :vanId)
          AND (:loadType IS NULL OR l.loadType = :loadType)
          AND l.createdAt >= :from AND l.createdAt < :to
        ORDER BY l.createdAt DESC
        """)
    Page<VanLoad> search(@Param("vanId") Long vanId, @Param("loadType") VanLoadType loadType,
                         @Param("from") LocalDateTime from, @Param("to") LocalDateTime to, Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime dateTime);

    /** وقت آخر سند مؤكد من نوع معيّن للسيارة (null إن لم يوجد). */
    @Query("""
        SELECT MAX(l.createdAt) FROM VanLoad l
        WHERE l.van.id = :vanId AND l.loadType = :loadType AND l.status = com.vanerp.model.VanLoadStatus.CONFIRMED
        """)
    LocalDateTime lastOf(@Param("vanId") Long vanId, @Param("loadType") VanLoadType loadType);

    /** أول تحميل مؤكد للسيارة بعد لحظة معيّنة (منذ متى البضاعة على السيارة دون تنزيل). */
    @Query("""
        SELECT MIN(l.createdAt) FROM VanLoad l
        WHERE l.van.id = :vanId AND l.loadType = com.vanerp.model.VanLoadType.LOAD
          AND l.status = com.vanerp.model.VanLoadStatus.CONFIRMED AND l.createdAt > :after
        """)
    LocalDateTime firstLoadAfter(@Param("vanId") Long vanId, @Param("after") LocalDateTime after);
}
