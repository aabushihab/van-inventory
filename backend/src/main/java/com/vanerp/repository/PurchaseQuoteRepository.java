package com.vanerp.repository;

import com.vanerp.model.PurchaseQuote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface PurchaseQuoteRepository extends JpaRepository<PurchaseQuote, Long> {
    Page<PurchaseQuote> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime dateTime);

    @Query("""
        SELECT q FROM PurchaseQuote q
        LEFT JOIN q.supplier s
        WHERE (:supplierId IS NULL OR s.id = :supplierId)
          AND q.createdAt >= :from
          AND q.createdAt < :to
          AND (:q IS NULL OR LOWER(q.quoteNumber) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
        ORDER BY q.createdAt DESC
        """)
    Page<PurchaseQuote> search(@Param("supplierId") Long supplierId, @Param("from") LocalDateTime from,
                                @Param("to") LocalDateTime to, @Param("q") String q, Pageable pageable);
}
