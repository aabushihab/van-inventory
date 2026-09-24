package com.ceramicerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "sales_invoice_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sales_invoice_id", nullable = false)
    private SalesInvoice salesInvoice;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** مخزن مختلف عن مخزن الفاتورة الافتراضي لهذا السطر تحديداً (اختياري - يسمح بنفس الصنف من أكثر من مخزن بالفاتورة الواحدة). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 14, scale = 3)
    private BigDecimal unitPrice;

    /** سعر شراء الوحدة وقت هذا البيع تحديداً (لحساب أرباح تاريخي ثابت لا يتغيّر مع تغيّر سعر شراء المنتج لاحقاً). */
    @Column(name = "unit_cost", nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal unitCost = BigDecimal.ZERO;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 3)
    private BigDecimal lineTotal;

    @Column(name = "returned_quantity", nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private BigDecimal returnedQuantity = BigDecimal.ZERO;
}
