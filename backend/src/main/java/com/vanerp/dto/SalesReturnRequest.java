package com.vanerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SalesReturnRequest(
        @NotEmpty(message = "يجب اختيار صنف واحد على الأقل للإرجاع") @Valid List<SalesReturnItemRequest> items,
        String notes
) {}
