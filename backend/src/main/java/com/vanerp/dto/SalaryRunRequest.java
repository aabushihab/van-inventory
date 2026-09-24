package com.vanerp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** صرف رواتب شهر لمجموعة موظفين مفعّلين (أو كلهم إن كانت القائمة فارغة) من حساب واحد. */
public record SalaryRunRequest(
        @NotNull Integer year,
        @NotNull @Min(1) @Max(12) Integer month,
        @NotNull(message = "اختر الحساب (كاش/بنك) الذي تُصرف منه الرواتب") Long accountId,
        LocalDate paymentDate,
        List<Long> employeeIds
) {}
