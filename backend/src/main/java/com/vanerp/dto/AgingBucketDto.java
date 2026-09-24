package com.vanerp.dto;

import java.math.BigDecimal;

public record AgingBucketDto(
        Long partyId,
        String partyName,
        BigDecimal current,
        BigDecimal days31to60,
        BigDecimal days61to90,
        BigDecimal over90,
        BigDecimal total
) {}
