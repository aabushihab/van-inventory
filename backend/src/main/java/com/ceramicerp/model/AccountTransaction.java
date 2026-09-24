package com.ceramicerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "account_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TxDirection direction;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private AccountSourceType sourceType;

    /** معرّف السجل المصدر (مصروف، دفعة فاتورة...) - يُستخدم لإيجاد/حذف الحركة المرتبطة عند تعديل/حذف المصدر. */
    @Column(name = "source_id")
    private Long sourceId;

    @Column(length = 255)
    private String notes;

    /** مطابَقة مع كشف الحساب البنكي الفعلي - للتسوية البنكية. */
    @Column(nullable = false)
    @Builder.Default
    private boolean reconciled = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
