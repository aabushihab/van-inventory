package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * حسم عجز: SALARY_DEDUCTED (مع السنة والشهر) أو PAID (مع الحساب/الصندوق) أو WAIVED (مع ملاحظة السبب).
 */
public record ShortageSettleRequest(
        @NotBlank @Pattern(regexp = "SALARY_DEDUCTED|PAID|WAIVED", message = "طريقة الحسم غير صحيحة") String method,
        Integer salaryYear,
        Integer salaryMonth,
        Long accountId,
        String note
) {}
