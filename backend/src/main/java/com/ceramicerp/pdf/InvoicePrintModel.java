package com.ceramicerp.pdf;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * نموذج بيانات موحّد لطباعة فواتير البيع والشراء (A4 أو إيصال حراري).
 * Unified print data model for sales/purchase invoices (A4 or thermal receipt).
 */
@Getter
@Builder
public class InvoicePrintModel {
    private String invoiceTypeLabel;   // "فاتورة بيع" / "فاتورة شراء"
    private String invoiceNumber;
    private LocalDateTime date;
    private String partyLabel;         // "العميل" / "المورد"
    private String partyName;
    private String partyTaxNumber;
    private String branchName;
    private String warehouseName;
    private String cashierName;
    private String status;
    private String paymentMethod;
    private String notes;

    private BigDecimal subtotal;
    private BigDecimal taxTotal;
    private BigDecimal discountTotal;
    private BigDecimal grandTotal;
    private BigDecimal returnedTotal;
    private BigDecimal netTotal;
    private BigDecimal paidAmount;
    private BigDecimal dueAmount;

    private String companyName;
    private String companyNameEn;
    private String companyPhone;
    private String companyAddress;
    private String companyTaxNumber;
    private String currency;

    private List<Row> items;

    @Getter
    @Builder
    public static class Row {
        private String name;
        private String sku;
        private String unit;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal discount;
        private BigDecimal taxRate;
        private BigDecimal lineTotal;
        private BigDecimal returnedQuantity;
    }
}
