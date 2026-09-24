package com.ceramicerp.controller;

import com.ceramicerp.dto.ExpenseDto;
import com.ceramicerp.dto.ExpenseRequest;
import com.ceramicerp.pdf.PdfInvoiceService;
import com.ceramicerp.pdf.VoucherPrintModel;
import com.ceramicerp.security.UserPrincipal;
import com.ceramicerp.service.ExpenseService;
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

import java.time.LocalDate;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final PdfInvoiceService pdfInvoiceService;

    @GetMapping("/page")
    @PreAuthorize("hasAuthority('EXPENSE_VIEW')")
    public Page<ExpenseDto> search(@RequestParam(required = false) String q,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                    @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "25") int size) {
        return expenseService.search(q, from, to, PageRequest.of(page, size));
    }

    @GetMapping("/by-employee/{employeeId}")
    @PreAuthorize("hasAuthority('EXPENSE_VIEW')")
    public java.util.List<ExpenseDto> byEmployee(@PathVariable Long employeeId) {
        return expenseService.byEmployee(employeeId);
    }

    @GetMapping("/salary-paid-summary")
    @PreAuthorize("hasAuthority('EXPENSE_VIEW')")
    public java.util.Map<Long, java.math.BigDecimal> salaryPaidSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return expenseService.salaryPaidByEmployee(from, to);
    }

    @GetMapping("/{id}/voucher")
    @PreAuthorize("hasAuthority('EXPENSE_VIEW')")
    public ResponseEntity<byte[]> voucher(@PathVariable Long id) {
        ExpenseDto expense = expenseService.findById(id);
        VoucherPrintModel model = VoucherPrintModel.builder()
                .voucherNumber("SV-" + expense.id())
                .categoryLabel(expense.category())
                .employeeName(expense.employeeName() != null ? expense.employeeName() : "-")
                .amount(expense.amount())
                .currency(pdfInvoiceService.getCurrency())
                .date(expense.expenseDate())
                .notes(expense.notes())
                .recordedByName(expense.createdByName())
                .companyName(pdfInvoiceService.getCompanyName())
                .companyNameEn(pdfInvoiceService.getCompanyNameEn())
                .companyAddress(pdfInvoiceService.getCompanyAddress())
                .companyPhone(pdfInvoiceService.getCompanyPhone())
                .build();
        byte[] pdf = pdfInvoiceService.renderVoucher(model);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", model.getVoucherNumber() + ".pdf");
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('EXPENSE_MANAGE')")
    public ResponseEntity<ExpenseDto> create(@AuthenticationPrincipal UserPrincipal principal,
                                              @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(expenseService.create(request, principal.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('EXPENSE_MANAGE')")
    public ExpenseDto update(@AuthenticationPrincipal UserPrincipal principal,
                              @PathVariable Long id, @Valid @RequestBody ExpenseRequest request) {
        return expenseService.update(id, request, principal.getUser());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('EXPENSE_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        expenseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
