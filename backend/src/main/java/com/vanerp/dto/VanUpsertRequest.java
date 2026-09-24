package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record VanUpsertRequest(
        @NotBlank(message = "رمز السيارة مطلوب") String code,
        @NotBlank(message = "اسم السيارة مطلوب") String name,
        @NotBlank(message = "رقم اللوحة مطلوب")
        @Pattern(regexp = "^\\d{2}-\\d{1,7}$", message = "رقم اللوحة يجب أن يكون رمزاً من خانتين ثم - ثم رقم السيارة (مثال: 12-34567)")
        String plateNumber,
        @NotNull(message = "السائق مطلوب") Long driverId,
        Long salesmanId,
        @NotNull(message = "الفرع مطلوب") Long branchId,
        String notes,
        Boolean active
) {}
