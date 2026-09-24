package com.vanerp.dto;

import com.vanerp.model.AccountType;

import java.math.BigDecimal;

public record AccountBalanceDto(
        Long accountId,
        String name,
        AccountType type,
        BigDecimal balance
) {}
