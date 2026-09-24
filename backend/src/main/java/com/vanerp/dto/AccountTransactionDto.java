package com.vanerp.dto;

import com.vanerp.model.AccountSourceType;
import com.vanerp.model.TxDirection;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AccountTransactionDto(
        Long id,
        Long accountId,
        String accountName,
        TxDirection direction,
        BigDecimal amount,
        LocalDate transactionDate,
        AccountSourceType sourceType,
        Long sourceId,
        String notes,
        boolean reconciled,
        String createdByName,
        LocalDateTime createdAt
) {}
