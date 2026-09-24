package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record VanLoadCreateRequest(
        @NotNull(message = "السيارة مطلوبة") Long vanId,
        @NotNull(message = "المخزن مطلوب") Long warehouseId,
        @NotNull(message = "نوع العملية مطلوب") String loadType,
        String notes,
        @NotEmpty(message = "يجب إضافة صنف واحد على الأقل") @Valid List<VanLoadItemRequest> items
) {}
