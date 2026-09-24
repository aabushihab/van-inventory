package com.ceramicerp.dto;

import java.time.LocalDateTime;

public record AuditLogDto(
        Long id,
        String username,
        String httpMethod,
        String action,
        String entityType,
        String path,
        String description,
        LocalDateTime createdAt
) {}
