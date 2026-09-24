package com.vanerp.repository;

import com.vanerp.model.SalesQuote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface SalesQuoteRepository extends JpaRepository<SalesQuote, Long> {
    Page<SalesQuote> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByCreatedAtAfter(LocalDateTime dateTime);

    @Query("""
        SELECT q FROM SalesQuote q
        LEFT JOIN q.customer c
        WHERE (:customerId IS NULL OR c.id = :customerId)
          AND q.createdAt >= :from
          AND q.createdAt < :to
          AND (:q IS NULL OR LOWER(q.quoteNumber) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
        ORDER BY q.createdAt DESC
        """)
    Page<SalesQuote> search(@Param("customerId") Long customerId, @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to, @Param("q") String q, Pageable pageable);
}
