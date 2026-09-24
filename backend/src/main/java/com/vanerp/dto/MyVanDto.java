package com.vanerp.dto;

import java.util.List;

/** سيارة المستخدم الحالي (المندوب) وحمولتها الحالية - null إن لم يكن مربوطاً بسيارة. */
public record MyVanDto(
        VanDto van,
        boolean restricted,
        List<StockItemDto> stock
) {}
