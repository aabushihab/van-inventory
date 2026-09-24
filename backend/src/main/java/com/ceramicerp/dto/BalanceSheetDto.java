package com.ceramicerp.dto;

import java.math.BigDecimal;

public record BalanceSheetDto(
        BigDecimal cashAndBank,
        BigDecimal inventoryValue,
        BigDecimal accountsReceivable,
        BigDecimal fixedAssetsValue,
        BigDecimal totalAssets,
        BigDecimal accountsPayable,
        BigDecimal totalLiabilities,
        BigDecimal equity
) {}
