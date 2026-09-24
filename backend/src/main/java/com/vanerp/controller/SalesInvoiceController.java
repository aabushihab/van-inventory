package com.vanerp.controller;

import com.vanerp.dto.InvoiceItemDto;
import com.vanerp.dto.PartyBalanceDto;
import com.vanerp.dto.PaymentDto;
import com.vanerp.dto.SalesInvoiceCreateRequest;
import com.vanerp.dto.SalesInvoiceDto;
import com.vanerp.dto.SalesPaymentRequest;
import com.vanerp.dto.SalesRefundRequest;
import com.vanerp.dto.SalesReturnDto;
import com.vanerp.dto.SalesReturnRequest;
import com.vanerp.model.InvoiceStatus;
import com.vanerp.pdf.InvoicePrintModel;
import com.vanerp.pdf.PdfInvoiceService;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.ExcelExportService;
import com.vanerp.service.SalesInvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/sales-invoices")
@RequiredArgsConstructor
public class SalesInvoiceController {

    private final SalesInvoiceService salesInvoiceService;
    private final PdfInvoiceService pdfInvoiceService;
    private final ExcelExportService excelExportService;

    @GetMapping
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public Page<SalesInvoiceDto> findAll(@RequestParam(required = false) Long customerId,
                                          @RequestParam(required = false) InvoiceStatus status,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        if (customerId != null || status != null || from != null || to != null || (q != null && !q.isBlank())) {
            return salesInvoiceService.search(customerId, status, from, to, q, PageRequest.of(page, size));
        }
        return salesInvoiceService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) Long customerId,
                                          @RequestParam(required = false) InvoiceStatus status,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(required = false) String q) {
        Page<SalesInvoiceDto> page = (customerId != null || status != null || from != null || to != null || (q != null && !q.isBlank()))
                ? salesInvoiceService.search(customerId, status, from, to, q, PageRequest.of(0, 5000))
                : salesInvoiceService.findAll(PageRequest.of(0, 5000));

        List<String> headers = List.of("رقم الفاتورة", "التاريخ", "العميل", "الإجمالي الكلي",
                "المدفوع", "المتبقي", "مستحق الإرجاع للعميل", "الحالة");
        List<List<Object>> rows = new ArrayList<>();
        for (SalesInvoiceDto inv : page.getContent()) {
            rows.add(List.of(inv.invoiceNumber(), inv.createdAt(), inv.customerName() != null ? inv.customerName() : "-",
                    inv.grandTotal(), inv.paidAmount(), inv.dueAmount(), inv.creditOwed(), mapStatus(inv.status())));
        }
        byte[] content = excelExportService.build("فواتير البيع", headers, rows);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        responseHeaders.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename("فواتير-البيع.xlsx", java.nio.charset.StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(responseHeaders).body(content);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public SalesInvoiceDto findById(@PathVariable Long id) {
        return salesInvoiceService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public ResponseEntity<SalesInvoiceDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                   @Valid @RequestBody SalesInvoiceCreateRequest request) {
        return ResponseEntity.ok(salesInvoiceService.create(request, principal.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public SalesInvoiceDto update(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                   @Valid @RequestBody SalesInvoiceCreateRequest request) {
        return salesInvoiceService.update(id, request, principal.getUser());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        salesInvoiceService.cancel(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public SalesReturnDto recordReturn(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                        @Valid @RequestBody SalesReturnRequest request) {
        return salesInvoiceService.recordReturn(id, request, principal.getUser());
    }

    @GetMapping("/{id}/returns")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public java.util.List<SalesReturnDto> returns(@PathVariable Long id) {
        return salesInvoiceService.findReturnsByInvoice(id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public SalesInvoiceDto addPayment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                       @Valid @RequestBody SalesPaymentRequest request) {
        return salesInvoiceService.addPayment(id, request, principal.getUser());
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public java.util.List<PaymentDto> payments(@PathVariable Long id) {
        return salesInvoiceService.getPayments(id);
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public SalesInvoiceDto refund(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                   @Valid @RequestBody SalesRefundRequest request) {
        return salesInvoiceService.recordRefund(id, request, principal.getUser());
    }

    @GetMapping("/outstanding")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public Page<SalesInvoiceDto> outstanding(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return salesInvoiceService.outstanding(PageRequest.of(page, size));
    }

    @GetMapping("/balances-by-customer")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public java.util.List<PartyBalanceDto> balancesByCustomer() {
        return salesInvoiceService.balancesByCustomer();
    }

    @GetMapping("/{id}/print/a4")
    @PreAuthorize("hasAuthority('SALES_INVOICE_PRINT')")
    public ResponseEntity<byte[]> printA4(@PathVariable Long id) {
        SalesInvoiceDto invoice = salesInvoiceService.findById(id);
        byte[] pdf = pdfInvoiceService.renderA4(toPrintModel(invoice));
        return pdfResponse(pdf, invoice.invoiceNumber() + ".pdf");
    }

    @GetMapping("/{id}/print/thermal")
    @PreAuthorize("hasAuthority('SALES_INVOICE_PRINT')")
    public ResponseEntity<byte[]> printThermal(@PathVariable Long id, @RequestParam(defaultValue = "80") int width) {
        SalesInvoiceDto invoice = salesInvoiceService.findById(id);
        byte[] pdf = pdfInvoiceService.renderThermal(toPrintModel(invoice), width);
        return pdfResponse(pdf, invoice.invoiceNumber() + "-receipt.pdf");
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", filename);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private InvoicePrintModel toPrintModel(SalesInvoiceDto inv) {
        // قيمة المرتجع من هذه الفاتورة بنفس نسبة نصيب الكمية المرتجعة من كل سطر (نفس صيغة SalesInvoiceService.recordReturn)،
        // حتى تظهر الطباعة إجمالياً صافياً بدل إظهار الفاتورة وكأن الإرجاع لم يحدث.
        BigDecimal returnedTotal = inv.items().stream()
                .filter(it -> it.returnedQuantity() != null && it.returnedQuantity().signum() > 0)
                .map(it -> it.lineTotal().multiply(it.returnedQuantity())
                        .divide(it.quantity(), 3, java.math.RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return InvoicePrintModel.builder()
                .returnedTotal(returnedTotal)
                .netTotal(inv.grandTotal().subtract(returnedTotal))
                .invoiceTypeLabel("فاتورة بيع")
                .invoiceNumber(inv.invoiceNumber())
                .date(inv.createdAt())
                .partyLabel("العميل")
                .partyName(inv.customerName())
                .partyTaxNumber(inv.customerTaxNumber())
                .branchName(inv.branchName())
                .warehouseName(inv.warehouseName())
                .cashierName(inv.createdByName())
                .status(mapStatus(inv.status()))
                .paymentMethod(mapPaymentMethod(inv.paymentMethod()))
                .notes(inv.notes())
                .subtotal(inv.subtotal())
                .taxTotal(inv.taxTotal())
                .discountTotal(inv.discountTotal())
                .grandTotal(inv.grandTotal())
                .paidAmount(inv.paidAmount())
                .dueAmount(inv.dueAmount())
                .companyName(pdfInvoiceService.getCompanyName())
                .companyNameEn(pdfInvoiceService.getCompanyNameEn())
                .companyPhone(pdfInvoiceService.getCompanyPhone())
                .companyAddress(pdfInvoiceService.getCompanyAddress())
                .companyTaxNumber(pdfInvoiceService.getCompanyTaxNumber())
                .currency(pdfInvoiceService.getCurrency())
                .items(inv.items().stream().map(this::toRow).toList())
                .build();
    }

    private InvoicePrintModel.Row toRow(InvoiceItemDto it) {
        return InvoicePrintModel.Row.builder()
                .name(it.productName()).sku(it.productSku()).unit(it.unitName())
                .quantity(it.quantity()).unitPrice(it.unitPrice())
                .discount(it.discount()).taxRate(it.taxRate()).lineTotal(it.lineTotal())
                .returnedQuantity(it.returnedQuantity())
                .build();
    }

    private String mapStatus(String status) {
        return switch (status) {
            case "CONFIRMED" -> "مؤكدة";
            case "CANCELLED" -> "ملغاة";
            case "DRAFT" -> "مسودة";
            case "RETURNED" -> "مرتجعة";
            default -> status;
        };
    }

    private String mapPaymentMethod(String pm) {
        return switch (pm) {
            case "CASH" -> "نقداً";
            case "CARD" -> "بطاقة";
            case "TRANSFER" -> "تحويل بنكي";
            case "CREDIT" -> "آجل";
            default -> pm;
        };
    }
}
