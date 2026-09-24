package com.vanerp.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record LoadRequestDto(
        Long id,
        Long vanId,
        String vanName,
        String plateNumber,
        String requestedByName,
        LocalDate forDate,
        String status,
        String notes,
        String responseNote,
        Long vanLoadId,
        String vanLoadNumber,
        String decidedByName,
        LocalDateTime decidedAt,
        LocalDateTime createdAt,
        List<VanLoadItemDto> items
) {}
