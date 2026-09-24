package com.vanerp.dto;

import jakarta.validation.Valid;

import java.util.List;

/** الموافقة: المخزن + الأصناف النهائية (قد يعدّلها المدير). الرفض: note فقط. */
public record LoadRequestDecisionRequest(
        Long warehouseId,
        @Valid List<VanLoadItemRequest> items,
        String note
) {}
