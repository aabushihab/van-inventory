package com.ceramicerp.dto;

import java.math.BigDecimal;

public record PartyBalanceDto(
        Long partyId,
        String partyName,
        long invoiceCount,
        BigDecimal totalGrandTotal,
        BigDecimal totalPaid,
        BigDecimal totalDue
) {}
