package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

public record BranchDto(Long id, @NotBlank String name, String nameEn, String address, String phone, boolean active) {}
