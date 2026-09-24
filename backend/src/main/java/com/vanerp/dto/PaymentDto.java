package com.vanerp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentDto(
        Long id,
        BigDecimal amount,
        String paymentMethod,
        String note,
        String accountName,
        String createdByName,
        LocalDateTime createdAt
) {}
