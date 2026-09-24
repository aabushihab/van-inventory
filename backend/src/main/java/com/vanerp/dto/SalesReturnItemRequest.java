package com.vanerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SalesReturnItemRequest(
        @NotNull Long invoiceItemId,
        @NotNull @DecimalMin(value = "0.001", message = "الكمية يجب أن تكون أكبر من صفر") BigDecimal quantity,
        /** مرتجع تالف/منتهي: يُسجَّل تالفاً بدل أن يعود للبيع. */
        Boolean damaged
) {}
