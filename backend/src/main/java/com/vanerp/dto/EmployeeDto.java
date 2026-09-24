package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record EmployeeDto(
        Long id,
        @NotBlank String name,
        @NotBlank(message = "الوظيفة مطلوبة")
        @Pattern(regexp = "DRIVER|SALESMAN|WAREHOUSE_KEEPER|ACCOUNTANT|CASHIER|MANAGER|WORKER|OTHER", message = "الوظيفة غير صحيحة")
        String position,
        @NotNull @DecimalMin(value = "0") BigDecimal monthlySalary,
        String phone,
        boolean active
) {}
