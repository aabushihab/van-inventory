package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record RoleUpsertRequest(
        @NotBlank String name,
        String nameAr,
        String description,
        List<Long> permissionIds
) {}
