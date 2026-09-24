package com.vanerp.dto;

import java.time.LocalDateTime;

public record BackupFileDto(
        String fileName,
        long sizeBytes,
        LocalDateTime createdAt
) {}
