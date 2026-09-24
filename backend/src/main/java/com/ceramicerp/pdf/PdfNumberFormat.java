package com.ceramicerp.pdf;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * تنسيق الأرقام داخل قوالب PDF ثنائية الاتجاه (RTL): يُحيط الرقم بعلامتي عزل اتجاه يونيكود (LRI/PDI) لمنع خوارزمية
 * bidi في openhtmltopdf من إعادة ترتيب الفاصلة العشرية بشكل خاطئ عند تضمين رقم لاتيني داخل فقرة عربية.
 * بدون هذا العزل تظهر الفاصلة العشرية كرمز "؟" في بعض الحالات رغم أن البيانات صحيحة.
 * <p>
 * Formats numbers for bidi (RTL) PDF templates: wraps the number with Unicode directional-isolate marks
 * (LRI/PDI) so openhtmltopdf's bidi algorithm doesn't mis-reorder the decimal point when a Latin number is
 * embedded inside an Arabic paragraph. Without this isolation the decimal point can render as "?" even
 * though the underlying data is correct.
 */
public final class PdfNumberFormat {

    private static final char LRI = '⁦';
    private static final char PDI = '⁩';

    private PdfNumberFormat() {}

    public static String num(BigDecimal value, int scale) {
        BigDecimal v = value != null ? value : BigDecimal.ZERO;
        String plain = v.setScale(scale, RoundingMode.HALF_UP).toPlainString();
        return LRI + plain + PDI;
    }
}
