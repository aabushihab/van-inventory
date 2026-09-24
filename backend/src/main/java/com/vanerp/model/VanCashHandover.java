package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** تسليم كاش السائق: المتوقع (رصيد صندوق السيارة) والمسلَّم فعلاً والفرق. */
@Entity
@Table(name = "van_cash_handovers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VanCashHandover {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "van_id", nullable = false)
    private Van van;

    @Column(name = "driver_name", length = 150)
    private String driverName;

    @Column(name = "expected_amount", nullable = false, precision = 14, scale = 3)
    private BigDecimal expectedAmount;

    @Column(name = "handed_amount", nullable = false, precision = 14, scale = 3)
    private BigDecimal handedAmount;

    /** المسلَّم - المتوقع: موجب = زيادة، سالب = عجز. */
    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal difference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_account_id")
    private Account toAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shortage_id")
    private VanShortage shortage;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
