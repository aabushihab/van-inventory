package com.vanerp.dto;

/** إعدادات الربط مع نظام الفوترة الوطني (تظهر كاملة لمدير النظام فقط - صلاحية ROLE_MANAGE). */
public record EInvoiceSettingsDto(
        boolean enabled,
        String taxpayerType,       // INCOME | GENERAL_SALES
        String sendMode,           // AUTO | MANUAL
        String sellerTaxNumber,
        String registrationName,
        String incomeSourceSeq,
        String clientId,
        String secretKey,
        boolean secretKeySet,
        String apiUrl,
        long pendingCount,
        long failedCount,
        long sentCount
) {}
