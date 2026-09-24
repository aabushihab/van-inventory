package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WarehouseDto(
        Long id,
        @NotNull Long branchId,
        String branchName,
        @NotBlank String name,
        String nameEn,
        String location,
        boolean isDefault,
        boolean active,
        String warehouseType
) {}
