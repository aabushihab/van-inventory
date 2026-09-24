package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * جرد السيارة وإغلاق جولتها: الكميات المعدودة فعلياً على السيارة (أي صنف غير مذكور يُعتبر مطابقاً للنظام)،
 * ثم يُنزَّل كل المتبقي إلى المخزن الرئيسي المحدد.
 */
public record VanCloseRequest(
        @NotNull(message = "المخزن مطلوب") Long warehouseId,
        String notes,
        /** SALE أو COST لتسعير العجز - فارغ = الافتراضي من إعدادات التنبيهات. */
        String pricing,
        @Valid List<VanCountLine> counts
) {}
