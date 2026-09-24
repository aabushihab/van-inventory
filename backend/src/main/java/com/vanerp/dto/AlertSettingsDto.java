package com.vanerp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record AlertSettingsDto(
        boolean expiryAlertsEnabled,
        @Min(value = 0, message = "عدد الأيام لا يمكن أن يكون سالباً") @Max(365) int defaultExpiryAlertDays,
        boolean vanAlertsEnabled,
        @Min(value = 1, message = "عدد الأيام يجب أن يكون 1 على الأقل") @Max(365) int vanNoLoadAlertDays,
        @Min(value = 1, message = "عدد الأيام يجب أن يكون 1 على الأقل") @Max(365) int vanNoUnloadAlertDays,
        @Pattern(regexp = "SALE|COST", message = "طريقة التسعير غير صحيحة") String shortagePricing,
        @DecimalMin(value = "0", message = "المبلغ لا يمكن أن يكون سالباً") BigDecimal shortageAlertThreshold
) {}
