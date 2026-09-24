package com.vanerp.repository;

import com.vanerp.model.EInvoiceSubmission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EInvoiceSubmissionRepository extends JpaRepository<EInvoiceSubmission, Long> {

    List<EInvoiceSubmission> findBySalesInvoiceIdOrderByIdAsc(Long salesInvoiceId);

    List<EInvoiceSubmission> findBySalesInvoiceIdIn(List<Long> salesInvoiceIds);

    Optional<EInvoiceSubmission> findFirstBySalesInvoiceIdAndDocType(Long salesInvoiceId, String docType);

    @Query("""
        SELECT s FROM EInvoiceSubmission s
        WHERE (:status IS NULL OR s.status = :status)
        ORDER BY s.id DESC
        """)
    Page<EInvoiceSubmission> search(@Param("status") String status, Pageable pageable);

    /** مستندات بانتظار الإرسال التلقائي: معلّقة، أو فشلت بخطأ اتصال مؤقت ومضى وقت كافٍ على آخر محاولة. */
    @Query("""
        SELECT s FROM EInvoiceSubmission s
        WHERE (s.status = 'PENDING' OR (s.status = 'FAILED' AND s.retryable = TRUE AND s.attempts < 20))
          AND (s.lastAttemptAt IS NULL OR s.lastAttemptAt < :before)
        ORDER BY s.id ASC
        """)
    List<EInvoiceSubmission> findDueForSending(@Param("before") LocalDateTime before, Pageable pageable);

    long countByStatus(String status);

    @Query(value = "SELECT nextval('einvoice_icv_seq')", nativeQuery = true)
    Long nextIcv();
}
