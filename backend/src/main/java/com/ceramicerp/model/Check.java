package com.ceramicerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Check {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CheckDirection direction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    /** اسم الدافع/المستلم عند عدم وجود عميل/مورد مسجّل. */
    @Column(name = "party_name", length = 150)
    private String partyName;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal amount;

    @Column(name = "check_number", length = 60)
    private String checkNumber;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private CheckStatus status = CheckStatus.PENDING;

    /** الحساب اللي انصرف/استُلم فيه الشيك فعلياً - يُحدَّد فقط عند التصفية (CLEARED). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_sales_invoice_id")
    private SalesInvoice relatedSalesInvoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_purchase_invoice_id")
    private PurchaseInvoice relatedPurchaseInvoice;

    @Column(length = 255)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
