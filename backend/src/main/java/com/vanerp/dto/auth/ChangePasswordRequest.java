package com.vanerp.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 6, message = "يجب ألا تقل كلمة المرور عن 6 أحرف") String newPassword
) {}
