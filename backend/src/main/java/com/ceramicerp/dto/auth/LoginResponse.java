package com.ceramicerp.dto.auth;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String username,
        String fullName,
        String role,
        Long branchId,
        String preferredLang,
        List<String> permissions
) {}
