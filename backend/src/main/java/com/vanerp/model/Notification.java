package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_product_id")
    private Product relatedProduct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_warehouse_id")
    private Warehouse relatedWarehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_sales_invoice_id")
    private SalesInvoice relatedSalesInvoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "related_purchase_invoice_id")
    private PurchaseInvoice relatedPurchaseInvoice;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
