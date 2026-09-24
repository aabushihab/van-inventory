package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 40)
    private String phone;

    @Column(length = 150)
    private String email;

    @Column(length = 255)
    private String address;

    @Column(name = "tax_number", length = 60)
    private String taxNumber;

    /** سقف الدين: أقصى مبلغ مستحق مسموح على العميل (فارغ = بدون سقف). */
    @Column(name = "credit_limit", precision = 14, scale = 3)
    private java.math.BigDecimal creditLimit;

    /** نوع هوية المشتري للفاتورة الإلكترونية: NIN رقم وطني | PN رقم شخصي لغير الأردني | TN رقم ضريبي. */
    @Column(name = "id_type", length = 5)
    private String idType;

    @Column(name = "id_number", length = 30)
    private String idNumber;

    @Column(name = "postal_code", length = 20)
    private String postalCode;

    /** رمز المحافظة حسب نظام الفوترة (JO-AM عمّان، JO-AZ الزرقاء ...). */
    @Column(name = "city_code", length = 10)
    private String cityCode;

    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
