package com.vanerp.controller;

import com.vanerp.dto.QuoteConfirmRequest;
import com.vanerp.dto.QuoteItemDto;
import com.vanerp.dto.SalesQuoteCreateRequest;
import com.vanerp.dto.SalesQuoteDto;
import com.vanerp.pdf.InvoicePrintModel;
import com.vanerp.pdf.PdfInvoiceService;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.SalesQuoteService;
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
@RequestMapping("/api/sales-quotes")
@RequiredArgsConstructor
public class SalesQuoteController {

    private final SalesQuoteService salesQuoteService;
    private final PdfInvoiceService pdfInvoiceService;

    @GetMapping
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public Page<SalesQuoteDto> findAll(@RequestParam(required = false) Long customerId,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                        @RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        if (customerId != null || from != null || to != null || (q != null && !q.isBlank())) {
            return salesQuoteService.search(customerId, from, to, q, PageRequest.of(page, size));
        }
        return salesQuoteService.findAll(PageRequest.of(page, size));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public SalesQuoteDto findById(@PathVariable Long id) {
        return salesQuoteService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public ResponseEntity<SalesQuoteDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                                 @Valid @RequestBody SalesQuoteCreateRequest request) {
        return ResponseEntity.ok(salesQuoteService.create(request, principal.getUser()));
    }

    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public SalesQuoteDto confirm(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                  @RequestBody QuoteConfirmRequest request) {
        return salesQuoteService.confirm(id, request, principal.getUser());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public ResponseEntity<Void> cancel(@PathVariable Long id) {
        salesQuoteService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/print/a4")
    @PreAuthorize("hasAuthority('SALES_INVOICE_PRINT')")
    public ResponseEntity<byte[]> printA4(@PathVariable Long id) {
        SalesQuoteDto quote = salesQuoteService.findById(id);
        byte[] pdf = pdfInvoiceService.renderA4(toPrintModel(quote));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", quote.quoteNumber() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    private InvoicePrintModel toPrintModel(SalesQuoteDto q) {
        return InvoicePrintModel.builder()
                .invoiceTypeLabel("عرض سعر بيع")
                .invoiceNumber(q.quoteNumber())
                .date(q.createdAt())
                .partyLabel("العميل")
                .partyName(q.customerName())
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
