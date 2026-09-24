package com.ceramicerp.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "اسم المستخدم مطلوب") String username,
        @NotBlank(message = "كلمة المرور مطلوبة") String password
) {}
