package com.vanerp.einvoice;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * يبني ملف XML للفاتورة الإلكترونية بمعيار UBL 2.1 حسب "الدليل التقني للربط مع نظام الفوترة الوطني" (الإصدار 1.4):
 * فاتورة جديدة (388) أو فاتورة إرجاع (381)، لنوعي المكلّف: فاتورة دخل (بدون ضريبة) وفاتورة مبيعات عامة.
 * ترتيب العناصر مطابق لترتيب مخطط UBL وأمثلة الدليل.
 */
public final class EInvoiceXmlBuilder {

    private EInvoiceXmlBuilder() {}

    /** سطر سلعة: الكمية وسعر الوحدة قبل الضريبة وخصم السطر وضريبته الفعلية. */
    public record Line(String name, BigDecimal quantity, BigDecimal unitPrice, BigDecimal discount,
                       BigDecimal taxAmount, BigDecimal taxPercent, String taxCategory) {}

    /** بيانات المشتري (كلها اختيارية ما عدا الاسم في حالات يحددها الدليل). */
    public record Buyer(String idType, String idNumber, String postalCode, String cityCode, String name, String phone) {}

    public record Doc(
            boolean isReturn,
            boolean withTax,          // true = مبيعات عامة، false = فاتورة دخل
            String typeCodeName,      // 011/021 (دخل) أو 012/022 (مبيعات عامة) - نقدي/ذمم
            String id, String uuid, LocalDate issueDate, String note, long icv,
            String originalId, String originalUuid, BigDecimal originalTotal, String returnReason,
            String sellerTaxNumber, String sellerName, String incomeSourceSeq,
            Buyer buyer,
            List<Line> lines) {}

    /** مجاميع المستند بنفس معادلات الدليل. */
    public record Totals(BigDecimal taxExclusive, BigDecimal discount, BigDecimal tax, BigDecimal taxInclusive) {}

    public static Totals totals(Doc d) {
        BigDecimal gross = BigDecimal.ZERO, disc = BigDecimal.ZERO, tax = BigDecimal.ZERO;
        for (Line l : d.lines()) {
            gross = gross.add(gross(l));
            disc = disc.add(nz(l.discount()));
            if (d.withTax()) tax = tax.add(nz(l.taxAmount()));
        }
        return new Totals(gross, disc, tax, gross.subtract(disc).add(tax));
    }

    public static String build(Doc d) {
        Totals t = totals(d);
        StringBuilder x = new StringBuilder(4096);
        x.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
         .append("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"")
         .append(" xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"")
         .append(" xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\"")
         .append(" xmlns:ext=\"urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2\">")
         .append("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>");

        // A. معلومات الفاتورة الأساسية
        el(x, "cbc:ID", d.id());
        el(x, "cbc:UUID", d.uuid());
        el(x, "cbc:IssueDate", d.issueDate().toString());
        x.append("<cbc:InvoiceTypeCode name=\"").append(esc(d.typeCodeName())).append("\">")
         .append(d.isReturn() ? "381" : "388").append("</cbc:InvoiceTypeCode>");
        if (d.note() != null && !d.note().isBlank()) el(x, "cbc:Note", d.note());
        el(x, "cbc:DocumentCurrencyCode", "JOD");
        el(x, "cbc:TaxCurrencyCode", "JOD");
        if (d.isReturn()) {
            x.append("<cac:BillingReference><cac:InvoiceDocumentReference>");
            el(x, "cbc:ID", d.originalId());
            el(x, "cbc:UUID", d.originalUuid());
            el(x, "cbc:DocumentDescription", amt(d.originalTotal()));
            x.append("</cac:InvoiceDocumentReference></cac:BillingReference>");
        }
        x.append("<cac:AdditionalDocumentReference>");
        el(x, "cbc:ID", "ICV");
        el(x, "cbc:UUID", String.valueOf(d.icv()));
        x.append("</cac:AdditionalDocumentReference>");

        // B. البائع (المكلّف)
        x.append("<cac:AccountingSupplierParty><cac:Party>")
         .append("<cac:PostalAddress><cac:Country><cbc:IdentificationCode>JO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>")
         .append("<cac:PartyTaxScheme>");
        el(x, "cbc:CompanyID", d.sellerTaxNumber());
        x.append("<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>")
         .append("<cac:PartyLegalEntity>");
        el(x, "cbc:RegistrationName", d.sellerName());
        x.append("</cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty>");

        // C. المشتري - بفاتورة الإرجاع وصف ثابت (بياناته من الفاتورة الأصلية)
        appendBuyer(x, d.isReturn() ? null : d.buyer());

        // D. تسلسل مصدر الدخل
        x.append("<cac:SellerSupplierParty><cac:Party><cac:PartyIdentification>");
        el(x, "cbc:ID", d.incomeSourceSeq());
        x.append("</cac:PartyIdentification></cac:Party></cac:SellerSupplierParty>");

        // سبب الإرجاع
        if (d.isReturn()) {
            x.append("<cac:PaymentMeans><cbc:PaymentMeansCode listID=\"UN/ECE 4461\">10</cbc:PaymentMeansCode>");
            el(x, "cbc:InstructionNote", d.returnReason());
            x.append("</cac:PaymentMeans>");
        }

        // E. مجموع الخصم والضريبة والإجماليات
        x.append("<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator>")
         .append("<cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason>");
        money(x, "cbc:Amount", t.discount());
        x.append("</cac:AllowanceCharge>");
        if (d.withTax()) {
            x.append("<cac:TaxTotal>");
            money(x, "cbc:TaxAmount", t.tax());
            if (d.isReturn()) {
                for (Line l : d.lines()) {
                    x.append("<cac:TaxSubtotal>");
                    money(x, "cbc:TaxableAmount", lineExtension(l));
                    money(x, "cbc:TaxAmount", nz(l.taxAmount()));
                    taxCategory(x, l);
                    x.append("</cac:TaxSubtotal>");
                }
            }
            x.append("</cac:TaxTotal>");
        }
        x.append("<cac:LegalMonetaryTotal>");
        money(x, "cbc:TaxExclusiveAmount", t.taxExclusive());
        money(x, "cbc:TaxInclusiveAmount", t.taxInclusive());
        money(x, "cbc:AllowanceTotalAmount", t.discount());
        if (d.isReturn() && d.withTax()) money(x, "cbc:PrepaidAmount", BigDecimal.ZERO);
        money(x, "cbc:PayableAmount", t.taxInclusive());
        x.append("</cac:LegalMonetaryTotal>");

        // F. تفاصيل السلع
        int n = 1;
        for (Line l : d.lines()) {
            x.append("<cac:InvoiceLine>");
            el(x, "cbc:ID", String.valueOf(n++));
            x.append("<cbc:InvoicedQuantity unitCode=\"PCE\">").append(qty(l.quantity())).append("</cbc:InvoicedQuantity>");
            money(x, "cbc:LineExtensionAmount", lineExtension(l));
            if (d.withTax()) {
                x.append("<cac:TaxTotal>");
                money(x, "cbc:TaxAmount", nz(l.taxAmount()));
                money(x, "cbc:RoundingAmount", lineExtension(l).add(nz(l.taxAmount())));
                x.append("<cac:TaxSubtotal>");
                if (d.isReturn()) money(x, "cbc:TaxableAmount", lineExtension(l));
                money(x, "cbc:TaxAmount", nz(l.taxAmount()));
                taxCategory(x, l);
                x.append("</cac:TaxSubtotal></cac:TaxTotal>");
            }
            x.append("<cac:Item>");
            el(x, "cbc:Name", l.name());
            x.append("</cac:Item><cac:Price>");
            money(x, "cbc:PriceAmount", l.unitPrice());
            if (d.isReturn() && d.withTax()) x.append("<cbc:BaseQuantity unitCode=\"C62\">1</cbc:BaseQuantity>");
            x.append("<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator>")
             .append("<cbc:AllowanceChargeReason>DISCOUNT</cbc:AllowanceChargeReason>");
            money(x, "cbc:Amount", nz(l.discount()));
            x.append("</cac:AllowanceCharge></cac:Price></cac:InvoiceLine>");
        }
        x.append("</Invoice>");
        return x.toString();
    }

    private static void appendBuyer(StringBuilder x, Buyer b) {
        x.append("<cac:AccountingCustomerParty><cac:Party>");
        if (b != null && notBlank(b.idType()) && notBlank(b.idNumber())) {
            x.append("<cac:PartyIdentification><cbc:ID schemeID=\"").append(esc(b.idType())).append("\">")
             .append(esc(b.idNumber())).append("</cbc:ID></cac:PartyIdentification>");
        }
        x.append("<cac:PostalAddress>");
        if (b != null && notBlank(b.postalCode())) el(x, "cbc:PostalZone", b.postalCode());
        if (b != null && notBlank(b.cityCode())) el(x, "cbc:CountrySubentityCode", b.cityCode());
        x.append("<cac:Country><cbc:IdentificationCode>JO</cbc:IdentificationCode></cac:Country></cac:PostalAddress>");
        x.append("<cac:PartyTaxScheme>");
        if (b != null && "TN".equals(b.idType()) && notBlank(b.idNumber())) el(x, "cbc:CompanyID", b.idNumber());
        x.append("<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>");
        x.append("<cac:PartyLegalEntity>");
        if (b != null && notBlank(b.name())) el(x, "cbc:RegistrationName", b.name());
        x.append("</cac:PartyLegalEntity></cac:Party>");
        if (b != null && notBlank(b.phone())) {
            x.append("<cac:AccountingContact>");
            el(x, "cbc:Telephone", b.phone().replaceAll("[^0-9+]", ""));
            x.append("</cac:AccountingContact>");
        }
        x.append("</cac:AccountingCustomerParty>");
    }

    private static void taxCategory(StringBuilder x, Line l) {
        x.append("<cac:TaxCategory><cbc:ID schemeAgencyID=\"6\" schemeID=\"UN/ECE 5305\">")
         .append(esc(l.taxCategory())).append("</cbc:ID>");
        el(x, "cbc:Percent", nz(l.taxPercent()).setScale(2, RoundingMode.HALF_UP).toPlainString());
        x.append("<cac:TaxScheme><cbc:ID schemeAgencyID=\"6\" schemeID=\"UN/ECE 5153\">VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>");
    }

    /** المبلغ الإجمالي للسلعة = سعر الوحدة × الكمية − خصم السلعة. */
    public static BigDecimal lineExtension(Line l) {
        return gross(l).subtract(nz(l.discount()));
    }

    private static BigDecimal gross(Line l) {
        return l.quantity().multiply(l.unitPrice()).setScale(3, RoundingMode.HALF_UP);
    }

    private static void el(StringBuilder x, String tag, String value) {
        x.append('<').append(tag).append('>').append(esc(value)).append("</").append(tag).append('>');
    }

    private static void money(StringBuilder x, String tag, BigDecimal v) {
        x.append('<').append(tag).append(" currencyID=\"JO\">").append(amt(v)).append("</").append(tag).append('>');
    }

    private static String amt(BigDecimal v) {
        return nz(v).setScale(3, RoundingMode.HALF_UP).toPlainString();
    }

    private static String qty(BigDecimal v) {
        return nz(v).setScale(3, RoundingMode.HALF_UP).toPlainString();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            switch (c) {
                case '&' -> b.append("&amp;");
                case '<' -> b.append("&lt;");
                case '>' -> b.append("&gt;");
                case '"' -> b.append("&quot;");
                case '\'' -> b.append("&apos;");
                default -> { if (c >= 0x20 || c == '\n' || c == '\t') b.append(c); }
            }
        }
        return b.toString();
    }
}
