package com.vanerp.repository;

import com.vanerp.model.InvoiceStatus;
import com.vanerp.model.PurchaseInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long> {
    Page<PurchaseInvoice> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);

    @Query("""
        SELECT p FROM PurchaseInvoice p
        LEFT JOIN p.supplier s
        WHERE (:supplierId IS NULL OR s.id = :supplierId)
          AND (:status IS NULL OR p.status = :status)
          AND p.createdAt >= :from
          AND p.createdAt < :to
          AND (:q IS NULL OR LOWER(p.invoiceNumber) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(s.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
        ORDER BY p.createdAt DESC
        """)
    Page<PurchaseInvoice> search(@Param("supplierId") Long supplierId, @Param("status") InvoiceStatus status,
                                  @Param("from") LocalDateTime from,
                                  @Param("to") LocalDateTime to, @Param("q") String q, Pageable pageable);

    /**
     * تشمل CONFIRMED و RETURNED معاً - فاتورة شراء مرتجعة بالكامل ما زالت عملية شراء حقيقية حدثت فعلاً،
     * ومرتجعها يُخصم بشكل منفصل حسب تاريخ الإرجاع نفسه (نفس منهجية فواتير البيع).
     */
    @Query("""
        SELECT p FROM PurchaseInvoice p
        WHERE p.status IN ('CONFIRMED', 'RETURNED') AND p.paidAmount < p.grandTotal
        ORDER BY p.createdAt DESC
        """)
    Page<PurchaseInvoice> findOutstanding(Pageable pageable);

    @Query("""
        SELECT p FROM PurchaseInvoice p LEFT JOIN FETCH p.supplier
        WHERE p.status IN ('CONFIRMED', 'RETURNED') AND p.paidAmount < p.grandTotal
        ORDER BY p.createdAt DESC
        """)
    List<PurchaseInvoice> findAllOutstanding();

    @Query("""
        SELECT p FROM PurchaseInvoice p LEFT JOIN FETCH p.supplier
        WHERE p.status IN ('CONFIRMED', 'RETURNED') AND p.createdAt >= :from AND p.createdAt < :to
        ORDER BY p.createdAt ASC
        """)
    List<PurchaseInvoice> findActiveWithSupplierBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** فواتير شراء مؤكدة تجاوزت تاريخ استحقاقها ولم تُسدَّد بالكامل بعد - لتنبيه التأخر عن السداد. */
    @Query("""
        SELECT p FROM PurchaseInvoice p LEFT JOIN FETCH p.supplier
        WHERE p.status = 'CONFIRMED' AND p.paidAmount < p.grandTotal
          AND p.dueDate IS NOT NULL AND p.dueDate < :today
        ORDER BY p.dueDate ASC
        """)
    List<PurchaseInvoice> findOverdue(@Param("today") java.time.LocalDate today);
}
