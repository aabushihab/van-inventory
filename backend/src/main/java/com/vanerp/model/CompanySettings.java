package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "company_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanySettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "name_en", length = 200)
    private String nameEn;

    @Column(name = "tax_number", length = 100)
    private String taxNumber;

    @Column(length = 60)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "JOD";

    /** صورة خلفية شاشة الدخول كنص base64 (نفس أسلوب Product.imageUrl/Expense.receiptImage). */
    @Column(name = "login_background_image", columnDefinition = "TEXT")
    private String loginBackgroundImage;

    /** شعار صغير (مربّع) يظهر برأس الصفحة وجنب اسم الشركة بشاشة الدخول - عادة يُولَّد مع نفس الخلفية. */
    @Column(columnDefinition = "TEXT")
    private String logo;

    // ---------- إعدادات التنبيهات ----------
    @Column(name = "expiry_alerts_enabled", nullable = false)
    @Builder.Default
    private boolean expiryAlertsEnabled = true;

    /** عدد الأيام الافتراضي للتنبيه قبل الانتهاء (للأصناف التي لم يُحدَّد لها عدد خاص). */
    @Column(name = "default_expiry_alert_days", nullable = false)
    @Builder.Default
    private int defaultExpiryAlertDays = 30;

    @Column(name = "van_alerts_enabled", nullable = false)
    @Builder.Default
    private boolean vanAlertsEnabled = true;

    /** تنبيه إن لم تُحمَّل السيارة منذ هذا العدد من الأيام. */
    @Column(name = "van_no_load_alert_days", nullable = false)
    @Builder.Default
    private int vanNoLoadAlertDays = 1;

    /** تنبيه إن بقيت بضاعة على السيارة دون تنزيل منذ هذا العدد من الأيام. */
    @Column(name = "van_no_unload_alert_days", nullable = false)
    @Builder.Default
    private int vanNoUnloadAlertDays = 3;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
