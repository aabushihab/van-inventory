package com.vanerp.repository;

import com.vanerp.model.PurchaseReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface PurchaseReturnRepository extends JpaRepository<PurchaseReturn, Long> {
    List<PurchaseReturn> findByPurchaseInvoiceIdOrderByCreatedAtDesc(Long purchaseInvoiceId);

    /** نفس منهجية SalesReturnRepository.findByInvoiceCreatedAtBetween: يُخصم المرتجع من فترة الفاتورة الأصلية. */
    @Query("SELECT r FROM PurchaseReturn r WHERE r.purchaseInvoice.createdAt >= :from AND r.purchaseInvoice.createdAt < :to"
            + " AND r.purchaseInvoice.status <> com.vanerp.model.InvoiceStatus.CANCELLED")
    List<PurchaseReturn> findByInvoiceCreatedAtBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(r.totalValue), 0) FROM PurchaseReturn r WHERE r.purchaseInvoice.id = :invoiceId")
    java.math.BigDecimal sumReturnedValueByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("SELECT r.purchaseInvoice.id, COALESCE(SUM(r.totalValue), 0) FROM PurchaseReturn r WHERE r.purchaseInvoice.id IN :invoiceIds GROUP BY r.purchaseInvoice.id")
    List<Object[]> sumReturnedValueByInvoiceIds(@Param("invoiceIds") List<Long> invoiceIds);
}
