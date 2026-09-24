package com.vanerp.dto;

import java.math.BigDecimal;

public record BalanceSheetDto(
        BigDecimal cashAndBank,
        BigDecimal inventoryValue,
        BigDecimal accountsReceivable,
        /** مبالغ دفعناها للموردين أكثر من المستحق (مرتجع/إلغاء بعد الدفع) - أصل لنا. */
        BigDecimal supplierCredits,
        BigDecimal fixedAssetsValue,
        BigDecimal totalAssets,
        BigDecimal accountsPayable,
        /** مبالغ قبضناها من العملاء أكثر من المستحق (مرتجع/إلغاء بعد الدفع) ولم تُرجَع لهم بعد - التزام علينا. */
        BigDecimal customerCredits,
        /** صافي الضريبة المستحقة للجهة الضريبية (محصّلة − مدفوعة)؛ سالب = رصيد ضريبي لصالح الشركة. */
        BigDecimal taxPayable,
        BigDecimal totalLiabilities,
        BigDecimal equity
) {}
