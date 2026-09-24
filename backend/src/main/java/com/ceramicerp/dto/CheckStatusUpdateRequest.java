package com.ceramicerp.dto;

import com.ceramicerp.model.CheckStatus;
import jakarta.validation.constraints.NotNull;

/** تحديث حالة شيك: CLEARED يتطلب accountId (الحساب اللي انصرف/استُلم فيه فعلياً)، BOUNCED/CANCELLED لا. */
public record CheckStatusUpdateRequest(
        @NotNull CheckStatus status,
        Long accountId
) {}
