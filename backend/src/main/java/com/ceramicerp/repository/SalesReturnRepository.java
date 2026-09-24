package com.ceramicerp.repository;

import com.ceramicerp.model.SalesReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SalesReturnRepository extends JpaRepository<SalesReturn, Long> {
    List<SalesReturn> findBySalesInvoiceIdOrderByCreatedAtDesc(Long salesInvoiceId);

    /**
     * مرتجعات تخص فواتير بيع أُنشئت ضمن الفترة (وليس مرتجعات أُنشئت هي نفسها ضمن الفترة) - تُستخدم
     * بالتقرير المالي حتى يُخصم المرتجع من فترة الفاتورة الأصلية بدل فترة الإرجاع نفسه، فلا يظهر يوم
     * هادئ بخسارة وهمية بسبب إرجاع بضاعة بيعت بفترة سابقة.
     */
    @Query("SELECT r FROM SalesReturn r WHERE r.salesInvoice.createdAt >= :from AND r.salesInvoice.createdAt < :to")
    List<SalesReturn> findByInvoiceCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(r.totalValue), 0) FROM SalesReturn r WHERE r.salesInvoice.id = :invoiceId")
    java.math.BigDecimal sumReturnedValueByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("SELECT COALESCE(SUM(r.totalValue), 0) FROM SalesReturn r WHERE r.createdAt >= :from AND r.createdAt < :to")
    java.math.BigDecimal sumTotalValueByCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** مجموع قيم مرتجعات كل فاتورة ضمن مجموعة فواتير (لتفادي استعلام منفصل لكل فاتورة عند حساب الأرصدة الإجمالية). */
    @Query("SELECT r.salesInvoice.id, COALESCE(SUM(r.totalValue), 0) FROM SalesReturn r WHERE r.salesInvoice.id IN :invoiceIds GROUP BY r.salesInvoice.id")
    List<Object[]> sumReturnedValueByInvoiceIds(@Param("invoiceIds") List<Long> invoiceIds);
}
