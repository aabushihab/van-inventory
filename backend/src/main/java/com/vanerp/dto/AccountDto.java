package com.vanerp.dto;

import com.vanerp.model.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record AccountDto(
        Long id,
        @NotBlank String name,
        @NotNull AccountType type,
        Long branchId,
        String branchName,
        @NotNull BigDecimal openingBalance,
        boolean active
) {}
