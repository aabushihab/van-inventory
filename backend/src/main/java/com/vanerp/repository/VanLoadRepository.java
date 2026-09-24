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
}
