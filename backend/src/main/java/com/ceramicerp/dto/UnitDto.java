package com.ceramicerp.dto;

import jakarta.validation.constraints.NotBlank;

public record UnitDto(Long id, @NotBlank String code, @NotBlank String name, String nameEn) {}
