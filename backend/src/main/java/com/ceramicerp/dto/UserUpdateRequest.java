package com.ceramicerp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserUpdateRequest(
        @NotBlank String fullName,
        @Email String email,
        String phone,
        @NotNull Long roleId,
        Long branchId,
        String preferredLang,
        boolean active
) {}
