package com.ceramicerp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank String username,
        @NotBlank @Size(min = 6, message = "يجب ألا تقل كلمة المرور عن 6 أحرف") String password,
        @NotBlank String fullName,
        @Email String email,
        String phone,
        @NotNull Long roleId,
        Long branchId,
        String preferredLang
) {}
