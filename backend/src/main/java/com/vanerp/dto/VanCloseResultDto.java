package com.vanerp.dto;

import java.math.BigDecimal;
import java.util.List;

/** نتيجة جرد وإغلاق السيارة: فروقات الجرد (العجز على المندوب/السائق) وسند التنزيل الناتج. */
public record VanCloseResultDto(
        BigDecimal shortageValue,
        BigDecimal surplusValue,
        List<VanCloseLineDto> lines,
        VanLoadDto unloadVoucher,
        String pricing,
        Long shortageId
) {}
