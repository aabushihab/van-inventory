package com.ceramicerp.dto;

import com.ceramicerp.model.AccountType;

import java.math.BigDecimal;

public record AccountBalanceDto(
        Long accountId,
        String name,
        AccountType type,
        BigDecimal balance
) {}
