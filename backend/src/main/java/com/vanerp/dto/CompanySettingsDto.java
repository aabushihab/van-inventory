package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

public record CompanySettingsDto(
        @NotBlank String name,
        String nameEn,
        String taxNumber,
        String phone,
        String address,
        String currency,
        String loginBackgroundImage,
        String logo
) {}
