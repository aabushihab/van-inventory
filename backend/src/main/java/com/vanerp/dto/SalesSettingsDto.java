package com.vanerp.dto;

/** إعدادات البيع والدفع: تفعيل الشيكات، والسماح للسائقين باستلامها. */
public record SalesSettingsDto(
        boolean checksEnabled,
        boolean driverChecksEnabled
) {}
