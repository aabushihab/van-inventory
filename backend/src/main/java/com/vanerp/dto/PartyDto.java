package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

/** يُستخدم للموردين والعملاء على حد سواء (Supplier / Customer). */
public record PartyDto(
        Long id,
        @NotBlank String name,
        String phone,
        String email,
        String address,
        String taxNumber,
        boolean active
) {}
