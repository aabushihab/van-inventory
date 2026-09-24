package com.ceramicerp.dto;

import java.time.LocalDateTime;

public record UserDto(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        Long roleId,
        String roleName,
        Long branchId,
        String branchName,
        String preferredLang,
        boolean active,
        LocalDateTime lastLoginAt
) {}
