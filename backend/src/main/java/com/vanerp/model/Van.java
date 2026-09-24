package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** سيارة توزيع - لكل سيارة مخزن خاص بها يمثّل البضاعة المحمّلة عليها حالياً. */
@Entity
@Table(name = "vans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Van {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "plate_number", length = 30)
    private String plateNumber;

    @Column(name = "driver_name", length = 120)
    private String driverName;

    @Column(name = "driver_phone", length = 40)
    private String driverPhone;

    /** مندوب المبيعات (مستخدم النظام) المسؤول عن السيارة - اختياري. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salesman_id")
    private User salesman;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "warehouse_id", nullable = false, unique = true)
    private Warehouse warehouse;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
