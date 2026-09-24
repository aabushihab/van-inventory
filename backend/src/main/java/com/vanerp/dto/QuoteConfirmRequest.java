package com.vanerp.dto;

import java.math.BigDecimal;

/**
 * بيانات إضافية مطلوبة فقط عند تأكيد عرض السعر وتحويله لفاتورة فعلية (الدفع لا يُطلب وقت إنشاء العرض نفسه).
 * Extra data needed only when confirming a quote into a real invoice (payment isn't asked for at quote-creation time).
 */
public record QuoteConfirmRequest(
        BigDecimal paidAmount,
        String paymentMethod,
        Long accountId
) {}
