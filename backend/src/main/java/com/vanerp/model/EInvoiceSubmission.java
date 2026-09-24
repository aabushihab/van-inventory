package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * مستند مُرسَل (أو بانتظار الإرسال) لنظام الفوترة الوطني: فاتورة بيع جديدة، أو فاتورة إرجاع لمرتجع جزئي،
 * أو فاتورة إرجاع كاملة عند إلغاء فاتورة سبق إرسالها. يُبنى الـ XML لحظة الإرسال من بيانات الفاتورة الحالية.
 */
@Entity
@Table(name = "einvoice_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EInvoiceSubmission {

    public static final String INVOICE = "INVOICE";
    public static final String RETURN = "RETURN";
    public static final String CANCEL_RETURN = "CANCEL_RETURN";

    public static final String PENDING = "PENDING";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "doc_type", nullable = false, length = 20)
    private String docType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_invoice_id", nullable = false)
    private SalesInvoice salesInvoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sales_return_id")
    private SalesReturn salesReturn;

    @Column(name = "doc_number", nullable = false, length = 60)
    private String docNumber;

    @Column(nullable = false, length = 36, unique = true)
    private String uuid;

    @Column(nullable = false)
    private Long icv;

    /** نقدي أو ذمم وقت إصدار الفاتورة (يحدد رمز نوع الفاتورة 01x/02x)، والإرجاع يأخذ نوع فاتورته الأصلية. */
    @Column(nullable = false)
    @Builder.Default
    private boolean cash = true;

    @Column(nullable = false, length = 15)
    @Builder.Default
    private String status = PENDING;

    /** false = خطأ بالبيانات (لن يُعاد تلقائياً قبل التصحيح)، true = خطأ اتصال مؤقت. */
    @Column(nullable = false)
    @Builder.Default
    private boolean retryable = true;

    @Column(nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "last_error", columnDefinition = "TEXT")
    private String lastError;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;

    @Column(columnDefinition = "TEXT")
    private String response;

    @Column(columnDefinition = "TEXT")
    private String xml;

    /** سبب الإرجاع (إجباري بفواتير الإرجاع). */
    @Column(length = 300)
    private String reason;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
