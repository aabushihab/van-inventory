package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** عجز على سائق سيارة توزيع، يُنشأ تلقائياً عند جرد السيارة إن كانت الكمية الفعلية أقل من المسجّلة. */
@Entity
@Table(name = "van_shortages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VanShortage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "van_id", nullable = false)
    private Van van;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_employee_id")
    private Employee driver;

    /** اسم السائق وقت العجز (يبقى حتى لو تغيّر سائق السيارة لاحقاً). */
    @Column(name = "driver_name", length = 150)
    private String driverName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salesman_id")
    private User salesman;

    /** SALE أو COST - السعر الذي حُسبت به قيمة العجز. */
    @Column(nullable = false, length = 10)
    private String pricing;

    @Column(name = "total_value", nullable = false, precision = 14, scale = 3)
    private BigDecimal totalValue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ShortageStatus status = ShortageStatus.PENDING;

    @Column(name = "salary_year")
    private Integer salaryYear;

    @Column(name = "salary_month")
    private Integer salaryMonth;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    @Column(name = "settlement_note", length = 500)
    private String settlementNote;

    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settled_by")
    private User settledBy;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "shortage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VanShortageItem> items = new ArrayList<>();
}
