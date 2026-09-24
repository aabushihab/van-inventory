package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** سند تحميل أو تنزيل بضاعة لسيارة توزيع. */
@Entity
@Table(name = "van_loads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VanLoad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "load_number", nullable = false, unique = true, length = 40)
    private String loadNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "van_id", nullable = false)
    private Van van;

    /** المخزن الرئيسي: مصدر البضاعة عند التحميل، ووجهتها عند التنزيل. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @Enumerated(EnumType.STRING)
    @Column(name = "load_type", nullable = false, length = 20)
    private VanLoadType loadType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private VanLoadStatus status = VanLoadStatus.CONFIRMED;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "vanLoad", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<VanLoadItem> items = new ArrayList<>();
}
