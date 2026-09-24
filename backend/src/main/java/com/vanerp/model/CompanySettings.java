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

    /** تسعير عجز السائقين الافتراضي: SALE = سعر البيع، COST = سعر التكلفة. */
    @Column(name = "shortage_pricing", nullable = false, length = 10)
    @Builder.Default
    private String shortagePricing = "SALE";

    /** تنبيه عند تسجيل عجز قيمته تساوي أو تزيد عن هذا المبلغ (0 = كل عجز). */
    @Column(name = "shortage_alert_threshold", nullable = false, precision = 14, scale = 3)
    @Builder.Default
    private java.math.BigDecimal shortageAlertThreshold = java.math.BigDecimal.ZERO;

    /** تفعيل البيع/التحصيل بالشيكات (يقرره المدير). */
    @Column(name = "checks_enabled", nullable = false)
    @Builder.Default
    private boolean checksEnabled = false;

    /** هل يستطيع السائقون (المندوبون) استلام شيكات من العملاء عند تفعيل الشيكات. */
    @Column(name = "driver_checks_enabled", nullable = false)
    @Builder.Default
    private boolean driverChecksEnabled = true;

    // ===== الربط مع نظام الفوترة الوطني (JoFotara) - اختياري =====
    @Column(name = "einv_enabled", nullable = false)
    @Builder.Default
    private boolean einvEnabled = false;

    /** INCOME = فاتورة دخل (غير مسجّل بضريبة المبيعات) | GENERAL_SALES = فاتورة مبيعات عامة. */
    @Column(name = "einv_taxpayer_type", nullable = false, length = 20)
    @Builder.Default
    private String einvTaxpayerType = "GENERAL_SALES";

    /** AUTO = إرسال تلقائي فور إنشاء الفاتورة | MANUAL = بزر من المحاسب. */
    @Column(name = "einv_send_mode", nullable = false, length = 10)
    @Builder.Default
    private String einvSendMode = "AUTO";

    @Column(name = "einv_registration_name", length = 200)
    private String einvRegistrationName;

    @Column(name = "einv_income_source_seq", length = 50)
    private String einvIncomeSourceSeq;

    @Column(name = "einv_client_id", length = 200)
    private String einvClientId;

    @Column(name = "einv_secret_key", length = 500)
    private String einvSecretKey;

    @Column(name = "einv_api_url", nullable = false, length = 300)
    @Builder.Default
    private String einvApiUrl = "https://backend.jofotara.gov.jo/core/invoices/";

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}
