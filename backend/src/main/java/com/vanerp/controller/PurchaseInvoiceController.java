package com.vanerp.controller;

import com.vanerp.dto.InvoiceItemDto;
import com.vanerp.dto.PartyBalanceDto;
import com.vanerp.dto.PaymentDto;
import com.vanerp.dto.PurchaseInvoiceCreateRequest;
import com.vanerp.dto.PurchaseInvoiceDto;
import com.vanerp.dto.PurchasePaymentRequest;
import com.vanerp.dto.PurchaseRefundRequest;
import com.vanerp.dto.PurchaseReturnDto;
import com.vanerp.dto.PurchaseReturnRequest;
import com.vanerp.model.InvoiceStatus;
import com.vanerp.pdf.InvoicePrintModel;
import com.vanerp.pdf.PdfInvoiceService;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.ExcelExportService;
import com.vanerp.service.PurchaseInvoiceService;
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
@RequestMapping("/api/purchase-invoices")
@RequiredArgsConstructor
public class PurchaseInvoiceController {

    private final PurchaseInvoiceService purchaseInvoiceService;
    private final PdfInvoiceService pdfInvoiceService;
    private final ExcelExportService excelExportService;

    @GetMapping
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public Page<PurchaseInvoiceDto> findAll(@RequestParam(required = false) Long supplierId,
                                             @RequestParam(required = false) InvoiceStatus status,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                             @RequestParam(required = false) String q,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        if (supplierId != null || status != null || from != null || to != null || (q != null && !q.isBlank())) {
            return purchaseInvoiceService.search(supplierId, status, from, to, q, PageRequest.of(page, size));
        }
        return purchaseInvoiceService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public ResponseEntity<byte[]> export(@RequestParam(required = false) Long supplierId,
                                          @RequestParam(required = false) InvoiceStatus status,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(required = false) String q) {
        Page<PurchaseInvoiceDto> page = (supplierId != null || status != null || from != null || to != null || (q != null && !q.isBlank()))
                ? purchaseInvoiceService.search(supplierId, status, from, to, q, PageRequest.of(0, 5000))
                : purchaseInvoiceService.findAll(PageRequest.of(0, 5000));

        List<String> headers = List.of("رقم الفاتورة", "التاريخ", "المورد", "الإجمالي الكلي",
                "المدفوع", "المتبقي", "مستحق الإرجاع من المورد", "الحالة");
        List<List<Object>> rows = new ArrayList<>();
        for (PurchaseInvoiceDto inv : page.getContent()) {
            rows.add(List.of(inv.invoiceNumber(), inv.createdAt(), inv.supplierName() != null ? inv.supplierName() : "-",
                    inv.grandTotal(), inv.paidAmount(), inv.dueAmount(), inv.creditOwed(), mapStatus(inv.status())));
        }
        byte[] content = excelExportService.build("فواتير الشراء", headers, rows);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        responseHeaders.setContentDisposition(org.springframework.http.ContentDisposition.attachment()
                .filename("فواتير-الشراء.xlsx", java.nio.charset.StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(responseHeaders).body(content);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public PurchaseInvoiceDto findById(@PathVariable Long id) {
        return purchaseInvoiceService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public ResponseEntity<PurchaseInvoiceDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                       @Valid @RequestBody PurchaseInvoiceCreateRequest request) {
        return ResponseEntity.ok(purchaseInvoiceService.create(request, principal.getUser()));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        purchaseInvoiceService.cancel(id, principal.getUser());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/return")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public PurchaseReturnDto recordReturn(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                           @Valid @RequestBody PurchaseReturnRequest request) {
        return purchaseInvoiceService.recordReturn(id, request, principal.getUser());
    }

    @GetMapping("/{id}/returns")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public java.util.List<PurchaseReturnDto> returns(@PathVariable Long id) {
        return purchaseInvoiceService.findReturnsByInvoice(id);
    }

    @PostMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public PurchaseInvoiceDto addPayment(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                          @Valid @RequestBody PurchasePaymentRequest request) {
        return purchaseInvoiceService.addPayment(id, request, principal.getUser());
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public java.util.List<PaymentDto> payments(@PathVariable Long id) {
        return purchaseInvoiceService.getPayments(id);
    }

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public PurchaseInvoiceDto refund(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                      @Valid @RequestBody PurchaseRefundRequest request) {
        return purchaseInvoiceService.recordRefund(id, request, principal.getUser());
    }

    @GetMapping("/outstanding")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public Page<PurchaseInvoiceDto> outstanding(@RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return purchaseInvoiceService.outstanding(PageRequest.of(page, size));
    }

    @GetMapping("/balances-by-supplier")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public java.util.List<PartyBalanceDto> balancesBySupplier() {
        return purchaseInvoiceService.balancesBySupplier();
    }

    @GetMapping("/{id}/print/a4")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public ResponseEntity<byte[]> printA4(@PathVariable Long id) {
        PurchaseInvoiceDto invoice = purchaseInvoiceService.findById(id);
        byte[] pdf = pdfInvoiceService.renderA4(toPrintModel(invoice));
        return pdfResponse(pdf, invoice.invoiceNumber() + ".pdf");
    }

    @GetMapping("/{id}/print/thermal")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public ResponseEntity<byte[]> printThermal(@PathVariable Long id, @RequestParam(defaultValue = "80") int width) {
        PurchaseInvoiceDto invoice = purchaseInvoiceService.findById(id);
        byte[] pdf = pdfInvoiceService.renderThermal(toPrintModel(invoice), width);
        return pdfResponse(pdf, invoice.invoiceNumber() + "-receipt.pdf");
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] pdf, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", filename);
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private InvoicePrintModel toPrintModel(PurchaseInvoiceDto inv) {
        // قيمة المرتجع من هذه الفاتورة بنفس نسبة نصيب الكمية المرتجعة من كل سطر (نفس صيغة PurchaseInvoiceService.recordReturn)،
        // حتى تظهر الطباعة إجمالياً صافياً بدل إظهار الفاتورة وكأن الإرجاع لم يحدث.
        BigDecimal returnedTotal = inv.items().stream()
                .filter(it -> it.returnedQuantity() != null && it.returnedQuantity().signum() > 0)
                .map(it -> it.lineTotal().multiply(it.returnedQuantity())
                        .divide(it.quantity(), 3, java.math.RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return InvoicePrintModel.builder()
                .returnedTotal(returnedTotal)
                .netTotal(inv.grandTotal().subtract(returnedTotal))
                .invoiceTypeLabel("فاتورة شراء")
                .invoiceNumber(inv.invoiceNumber())
                .date(inv.createdAt())
                .partyLabel("المورد")
                .partyName(inv.supplierName())
                .partyTaxNumber(inv.supplierTaxNumber())
                .branchName(inv.branchName())
                .warehouseName(inv.warehouseName())
                .cashierName(inv.createdByName())
                .status(mapStatus(inv.status()))
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
}
