package com.vanerp.controller;

import com.vanerp.dto.PurchaseQuoteCreateRequest;
import com.vanerp.dto.PurchaseQuoteDto;
import com.vanerp.dto.QuoteConfirmRequest;
import com.vanerp.dto.QuoteItemDto;
import com.vanerp.pdf.InvoicePrintModel;
import com.vanerp.pdf.PdfInvoiceService;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.PurchaseQuoteService;
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

@RestController
@RequestMapping("/api/purchase-quotes")
@RequiredArgsConstructor
public class PurchaseQuoteController {

    private final PurchaseQuoteService purchaseQuoteService;
    private final PdfInvoiceService pdfInvoiceService;

    @GetMapping
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public Page<PurchaseQuoteDto> findAll(@RequestParam(required = false) Long supplierId,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "20") int size) {
        if (supplierId != null || from != null || to != null || (q != null && !q.isBlank())) {
            return purchaseQuoteService.search(supplierId, from, to, q, PageRequest.of(page, size));
        }
        return purchaseQuoteService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public PurchaseQuoteDto findById(@PathVariable Long id) {
        return purchaseQuoteService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public ResponseEntity<PurchaseQuoteDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                    @Valid @RequestBody PurchaseQuoteCreateRequest request) {
        return ResponseEntity.ok(purchaseQuoteService.create(request, principal.getUser()));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public PurchaseQuoteDto confirm(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                     @RequestBody QuoteConfirmRequest request) {
        return purchaseQuoteService.confirm(id, request, principal.getUser());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_CREATE')")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        purchaseQuoteService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/print/a4")
    @PreAuthorize("hasAuthority('PURCHASE_INVOICE_VIEW')")
    public ResponseEntity<byte[]> printA4(@PathVariable Long id) {
        PurchaseQuoteDto quote = purchaseQuoteService.findById(id);
        byte[] pdf = pdfInvoiceService.renderA4(toPrintModel(quote));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", quote.quoteNumber() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private InvoicePrintModel toPrintModel(PurchaseQuoteDto q) {
        return InvoicePrintModel.builder()
                .invoiceTypeLabel("عرض سعر شراء")
                .invoiceNumber(q.quoteNumber())
                .date(q.createdAt())
                .partyLabel("المورد")
                .partyName(q.supplierName())
                .branchName(q.branchName())
                .warehouseName(q.warehouseName())
                .cashierName(q.createdByName())
                .status(mapStatus(q.status()))
                .notes(q.notes())
                .subtotal(q.subtotal())
                .taxTotal(q.taxTotal())
                .discountTotal(q.discountTotal())
                .grandTotal(q.grandTotal())
                .paidAmount(BigDecimal.ZERO)
                .dueAmount(q.grandTotal())
                .companyName(pdfInvoiceService.getCompanyName())
                .companyNameEn(pdfInvoiceService.getCompanyNameEn())
                .companyPhone(pdfInvoiceService.getCompanyPhone())
                .companyAddress(pdfInvoiceService.getCompanyAddress())
                .companyTaxNumber(pdfInvoiceService.getCompanyTaxNumber())
                .currency(pdfInvoiceService.getCurrency())
                .items(q.items().stream().map(this::toRow).toList())
                .build();
    }

    private InvoicePrintModel.Row toRow(QuoteItemDto it) {
        return InvoicePrintModel.Row.builder()
                .name(it.productName()).sku(it.productSku()).unit(it.unitName())
                .quantity(it.quantity()).unitPrice(it.unitPrice())
                .discount(it.discount()).taxRate(it.taxRate()).lineTotal(it.lineTotal())
                .build();
    }

    private String mapStatus(String status) {
        return switch (status) {
            case "PENDING" -> "قيد الانتظار";
            case "CONFIRMED" -> "مؤكد";
            case "CANCELLED" -> "ملغى";
            default -> status;
        };
    }
}
