package com.vanerp.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String category;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal amount;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    /** الشهر اللي يُحسب عليه هذا الراتب/السلفة (يوم 1 دائماً) - إلزامي فقط لفئتي "رواتب"/"سلفة"،
     * وقد يختلف عن expenseDate الفعلي (مثلاً سلفة أُعطيت اليوم لكن تُخصم من راتب شهر قادم). */
    @Column(name = "salary_period")
    private LocalDate salaryPeriod;

    @Column(length = 500)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    /** الحساب النقدي/البنكي اللي دُفع منه المصروف فعلياً (اختياري) - عند تحديده تُنشأ حركة حساب OUT تلقائياً. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    /** إلزامي فقط لفئتي "رواتب"/"سلفة" (يُتحقق منه بطبقة الخدمة) - يربط المصروف بالموظف كسند قبض له. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    /** صورة الفاتورة/الإيصال كنص base64 (نفس أسلوب Product.imageUrl) بدل بنية ملفات منفصلة. */
    @Column(name = "receipt_image", columnDefinition = "TEXT")
    private String receiptImage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
