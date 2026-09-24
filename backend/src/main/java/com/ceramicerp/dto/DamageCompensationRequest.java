package com.ceramicerp.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * تعويض المورد عن كمية من بضاعة تالفة سابقاً — يعيد الكمية للمخزون ويخصمها من صافي الخسارة المسجّلة.
 * Supplier compensation for a previously-damaged quantity — restores stock and reduces the recorded net loss.
 */
public record DamageCompensationRequest(
        @NotNull @DecimalMin(value = "0.001", message = "الكمية يجب أن تكون أكبر من صفر") BigDecimal quantity,
        String note
) {}
