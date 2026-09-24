package com.ceramicerp.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record PurchaseReturnRequest(
        @NotEmpty(message = "يجب اختيار صنف واحد على الأقل للإرجاع") @Valid List<PurchaseReturnItemRequest> items,
        String notes
) {}
