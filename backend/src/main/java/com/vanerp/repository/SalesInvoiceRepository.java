package com.vanerp.repository;

import com.vanerp.model.InvoiceStatus;
import com.vanerp.model.SalesInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SalesInvoiceRepository extends JpaRepository<SalesInvoice, Long> {
    Page<SalesInvoice> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
        SELECT s FROM SalesInvoice s
        LEFT JOIN s.customer c
        WHERE (:customerId IS NULL OR c.id = :customerId)
          AND (:status IS NULL OR s.status = :status)
          AND s.createdAt >= :from
          AND s.createdAt < :to
          AND (:q IS NULL OR LOWER(s.invoiceNumber) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                          OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
        ORDER BY s.createdAt DESC
        """)
    Page<SalesInvoice> search(@Param("customerId") Long customerId, @Param("status") InvoiceStatus status,
                               @Param("from") LocalDateTime from,
                               @Param("to") LocalDateTime to, @Param("q") String q, Pageable pageable);

    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM SalesInvoice s WHERE s.createdAt >= :from AND s.status IN ('CONFIRMED', 'RETURNED')")
    java.math.BigDecimal sumGrandTotalSince(LocalDateTime from);

    @Query("SELECT COALESCE(SUM(s.grandTotal), 0) FROM SalesInvoice s WHERE s.createdAt >= :from AND s.createdAt < :to AND s.status IN ('CONFIRMED', 'RETURNED')")
    java.math.BigDecimal sumGrandTotalBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    long countByCreatedAtAfterAndStatus(LocalDateTime dateTime, com.vanerp.model.InvoiceStatus status);

    /**
     * فواتير البيع الفعلية ضمن الفترة للتقارير المالية: تشمل CONFIRMED و RETURNED معاً، لأن الفاتورة المرتجعة
     * بالكامل تبقى عملية بيع حقيقية حدثت فعلاً — مرتجعها يُخصم بشكل منفصل حسب تاريخ الإرجاع نفسه. استثناء
     * RETURNED من هنا كان يُسقط كامل مبيعات وتكلفة الفاتورة المرتجعة بالكامل من تقرير فترتها الأصلية، بينما
     * يبقى خصم المرتجع نفسه سارياً في فترته - ما يُنقِص الأرباح المُبلَّغة بلا مقابل.
     */
    @Query("""
        SELECT DISTINCT s FROM SalesInvoice s
        JOIN FETCH s.items i
        JOIN FETCH i.product p
        WHERE s.status IN ('CONFIRMED', 'RETURNED') AND s.createdAt >= :from AND s.createdAt < :to
        ORDER BY s.createdAt ASC
        """)
    List<SalesInvoice> findConfirmedWithItemsBetween(LocalDateTime from, LocalDateTime to);

    @Query("""
        SELECT s FROM SalesInvoice s
        WHERE s.status = 'CONFIRMED' AND s.paidAmount < s.grandTotal
        ORDER BY s.createdAt DESC
        """)
    Page<SalesInvoice> findOutstanding(Pageable pageable);

    /**
     * كل الفواتير التي قد تكون مستحقة (قبل خصم قيمة أي مرتجعات - يُحسب ذلك في طبقة الخدمة)
     * لحساب الأرصدة الإجمالية لكل عميل دون تحميل كامل تاريخ الفواتير.
     */
    @Query("""
        SELECT s FROM SalesInvoice s
        LEFT JOIN FETCH s.customer c
        WHERE s.status = 'CONFIRMED' AND s.paidAmount < s.grandTotal
        ORDER BY s.createdAt DESC
        """)
    List<SalesInvoice> findAllOutstanding();

    /** فواتير بيع مؤكدة تجاوزت تاريخ استحقاقها ولم تُسدَّد بالكامل بعد - لتنبيه التأخر عن السداد. */
    @Query("""
        SELECT s FROM SalesInvoice s
        LEFT JOIN FETCH s.customer c
        WHERE s.status = 'CONFIRMED' AND s.paidAmount < s.grandTotal
          AND s.dueDate IS NOT NULL AND s.dueDate < :today
        ORDER BY s.dueDate ASC
        """)
    List<SalesInvoice> findOverdue(@Param("today") java.time.LocalDate today);

    /** فواتير البيع الصادرة من مخزن معيّن (مثل مخزن سيارة توزيع) ضمن فترة. */
    @Query("""
        SELECT s FROM SalesInvoice s
        WHERE s.warehouse.id = :warehouseId AND s.status IN ('CONFIRMED', 'RETURNED')
          AND s.createdAt >= :from AND s.createdAt < :to
        """)
    List<SalesInvoice> findByWarehouseBetween(@Param("warehouseId") Long warehouseId,
                                              @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
