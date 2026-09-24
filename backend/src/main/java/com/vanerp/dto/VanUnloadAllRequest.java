package com.vanerp.dto;

import jakarta.validation.constraints.NotNull;

/** تنزيل كل المتبقي بالسيارة دفعة واحدة إلى مخزن رئيسي (نهاية الجولة). */
public record VanUnloadAllRequest(
        @NotNull(message = "المخزن مطلوب") Long warehouseId,
        String notes
) {}
