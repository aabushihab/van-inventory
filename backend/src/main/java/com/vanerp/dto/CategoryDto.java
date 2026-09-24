package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryDto(Long id, @NotBlank String name, String nameEn, Long parentId, String parentName, boolean active) {}
