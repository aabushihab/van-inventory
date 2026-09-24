package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.time.LocalDate;
import java.util.List;

/** vanId يحدده المدير فقط؛ السائق يُستخدم له سيارته تلقائياً. الكميات بالوحدة الأساسية. */
public record LoadRequestCreateRequest(
        Long vanId,
        LocalDate forDate,
        String notes,
        @NotEmpty(message = "أضف صنفاً واحداً على الأقل") @Valid List<VanLoadItemRequest> items
) {}
