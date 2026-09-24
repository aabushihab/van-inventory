package com.vanerp.controller;

import com.vanerp.dto.EInvoiceSettingsDto;
import com.vanerp.dto.EInvoiceSubmissionDto;
import com.vanerp.einvoice.EInvoiceService;
import com.vanerp.repository.SalesInvoiceRepository;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.VanAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** الربط الاختياري مع نظام الفوترة الوطني: الإعدادات، ومتابعة المستندات، والإرسال اليدوي. */
@RestController
@RequestMapping("/api/einvoice")
@RequiredArgsConstructor
public class EInvoiceController {

    private final EInvoiceService eInvoiceService;
    private final SalesInvoiceRepository salesInvoiceRepository;
    private final VanAccessService vanAccessService;

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public EInvoiceSettingsDto settings() {
        return eInvoiceService.getSettings();
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('ROLE_MANAGE')")
    public EInvoiceSettingsDto updateSettings(@RequestBody EInvoiceSettingsDto request) {
        return eInvoiceService.updateSettings(request);
    }

    @GetMapping("/submissions")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public Page<EInvoiceSubmissionDto> submissions(@AuthenticationPrincipal UserPrincipal principal,
                                                   @RequestParam(required = false) String status,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) {
        vanAccessService.assertNotRestricted(principal.getUser());
        return eInvoiceService.search(status, PageRequest.of(page, size));
    }

    /** حالة الفوترة لمجموعة فواتير (لعمود قائمة المبيعات). */
    @GetMapping("/statuses")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public Map<Long, String> statuses(@RequestParam List<Long> invoiceIds) {
        return eInvoiceService.statuses(invoiceIds);
    }

    @GetMapping("/invoices/{invoiceId}")
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public List<EInvoiceSubmissionDto> forInvoice(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long invoiceId) {
        vanAccessService.assertNotRestricted(principal.getUser());
        return eInvoiceService.forInvoice(invoiceId);
    }

    @PostMapping("/invoices/{invoiceId}/send")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public EInvoiceSubmissionDto sendInvoice(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long invoiceId) {
        vanAccessService.assertNotRestricted(principal.getUser());
        return eInvoiceService.sendInvoice(invoiceId, salesInvoiceRepository);
    }

    @PostMapping("/submissions/{id}/send")
    @PreAuthorize("hasAuthority('SALES_INVOICE_CREATE')")
    public EInvoiceSubmissionDto resend(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        vanAccessService.assertNotRestricted(principal.getUser());
        return eInvoiceService.resend(id);
    }

    @GetMapping(value = "/submissions/{id}/xml", produces = MediaType.APPLICATION_XML_VALUE)
    @PreAuthorize("hasAuthority('SALES_INVOICE_VIEW')")
    public ResponseEntity<String> xml(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        vanAccessService.assertNotRestricted(principal.getUser());
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_XML).body(eInvoiceService.previewXml(id));
    }
}
