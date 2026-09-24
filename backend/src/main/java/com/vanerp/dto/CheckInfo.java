package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** بيانات شيك مستلم من العميل عند البيع أو التحصيل. image = صورة الشيك (base64). */
public record CheckInfo(
        @NotBlank(message = "رقم الشيك مطلوب") String checkNumber,
        String bankName,
        @NotNull(message = "تاريخ استحقاق الشيك مطلوب") LocalDate dueDate,
        String drawerName,
        String image
) {}
