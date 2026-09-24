package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record EmployeeDto(
        Long id,
        @NotBlank String name,
        String position,
        @NotNull @DecimalMin(value = "0") BigDecimal monthlySalary,
        String phone,
        boolean active
) {}
