package com.ceramicerp.controller;

import com.ceramicerp.dto.AccountBalanceDto;
import com.ceramicerp.dto.AccountDto;
import com.ceramicerp.dto.AccountTransactionDto;
import com.ceramicerp.dto.RecordTransactionRequest;
import com.ceramicerp.dto.TransferRequest;
import com.ceramicerp.model.AccountSourceType;
import com.ceramicerp.security.UserPrincipal;
import com.ceramicerp.service.AccountService;
import com.ceramicerp.service.ExcelExportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final ExcelExportService excelExportService;

    private static final Map<AccountSourceType, String> SOURCE_LABELS = Map.of(
            AccountSourceType.SALES_PAYMENT, "دفعة فاتورة بيع",
            AccountSourceType.PURCHASE_PAYMENT, "دفعة فاتورة شراء",
            AccountSourceType.EXPENSE, "مصروف",
            AccountSourceType.CAPITAL_IN, "إضافة رأس مال",
            AccountSourceType.CAPITAL_OUT, "سحب رأس مال",
            AccountSourceType.CHECK_CLEARED, "تصفية شيك",
            AccountSourceType.MANUAL, "حركة يدوية",
            AccountSourceType.TRANSFER, "تحويل بين حسابات"
    );

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNTS_VIEW')")
    public List<AccountDto> findAll() {
        return accountService.findAll();
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAuthority('ACCOUNTS_VIEW')")
    public List<AccountBalanceDto> balances() {
        return accountService.balances();
    }

    @GetMapping("/{id}/ledger")
    @PreAuthorize("hasAuthority('ACCOUNTS_VIEW')")
    public List<AccountTransactionDto> ledger(@PathVariable Long id,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return accountService.ledger(id, from, to);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public ResponseEntity<AccountDto> create(@Valid @RequestBody AccountDto dto) {
        return ResponseEntity.ok(accountService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public AccountDto update(@PathVariable Long id, @Valid @RequestBody AccountDto dto) {
        return accountService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        accountService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/ledger/export")
    @PreAuthorize("hasAuthority('ACCOUNTS_VIEW')")
    public ResponseEntity<byte[]> exportLedger(@PathVariable Long id,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<AccountTransactionDto> data = accountService.ledger(id, from, to);
        List<String> headers = List.of("التاريخ", "نوع الحركة", "المبلغ", "المصدر", "ملاحظات", "سجّلها", "مطابَقة");
        List<List<Object>> rows = new ArrayList<>();
        for (AccountTransactionDto d : data) {
            rows.add(List.of(
                    d.transactionDate().toString(),
                    d.direction().name().equals("IN") ? "إضافة" : "سحب",
                    d.amount(),
                    SOURCE_LABELS.getOrDefault(d.sourceType(), d.sourceType().name()),
                    d.notes() == null ? "" : d.notes(),
                    d.createdByName() == null ? "" : d.createdByName(),
                    d.reconciled() ? "نعم" : "لا"
            ));
        }
        byte[] content = excelExportService.build("دفتر الحركات", headers, rows);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        responseHeaders.setContentDisposition(ContentDisposition.attachment()
                .filename("دفتر-الحركات.xlsx", StandardCharsets.UTF_8).build());
        return ResponseEntity.ok().headers(responseHeaders).body(content);
    }

    @PostMapping("/transactions/manual")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public ResponseEntity<AccountTransactionDto> recordManual(@AuthenticationPrincipal UserPrincipal principal,
                                                                @Valid @RequestBody RecordTransactionRequest request) {
        return ResponseEntity.ok(accountService.recordManualTransaction(request, principal.getUser()));
    }

    @PostMapping("/transactions/capital")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public ResponseEntity<AccountTransactionDto> recordCapital(@AuthenticationPrincipal UserPrincipal principal,
                                                                 @Valid @RequestBody RecordTransactionRequest request) {
        return ResponseEntity.ok(accountService.recordCapitalTransaction(request, principal.getUser()));
    }

    @PutMapping("/transactions/{id}/reconcile")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public AccountTransactionDto reconcile(@PathVariable Long id, @RequestParam boolean reconciled) {
        return accountService.setReconciled(id, reconciled);
    }

    @PostMapping("/transfer")
    @PreAuthorize("hasAuthority('ACCOUNTS_MANAGE')")
    public ResponseEntity<Void> transfer(@AuthenticationPrincipal UserPrincipal principal,
                                          @Valid @RequestBody TransferRequest request) {
        accountService.transfer(request, principal.getUser());
        return ResponseEntity.noContent().build();
    }
}
