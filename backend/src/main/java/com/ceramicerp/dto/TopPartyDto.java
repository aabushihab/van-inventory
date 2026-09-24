package com.ceramicerp.dto;

import java.math.BigDecimal;

/** يُستخدم لأفضل العملاء (حسب المبيعات) وأفضل الموردين (حسب المشتريات). */
public record TopPartyDto(
        Long partyId,
        String partyName,
        long invoiceCount,
        BigDecimal totalAmount
) {}
