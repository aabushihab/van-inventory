package com.vanerp.controller;

import com.vanerp.dto.*;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.VanCashService;
import com.vanerp.service.VanLoadService;
import com.vanerp.service.SalesInvoiceService;
import com.vanerp.service.VanAccessService;
import com.vanerp.service.VanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/vans")
@RequiredArgsConstructor
public class VanController {

    private final VanService vanService;
    private final VanLoadService vanLoadService;
    private final VanCashService vanCashService;
    private final SalesInvoiceService salesInvoiceService;
    private final VanAccessService vanAccessService;

    // ---------- السيارات (Vans) ----------

    @GetMapping
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public List<VanDto> findAll() {
        return vanService.findAll();
    }

    /** سيارة المستخدم الحالي (المندوب) وحمولتها - متاحة لأي مستخدم مسجّل. */
    @GetMapping("/my")
    public MyVanDto myVan(@AuthenticationPrincipal UserPrincipal principal) {
        return vanLoadService.myVan(principal.getUser());
    }

    /** ديون عملاء سيارة المندوب (فواتير سيارته غير المسددة) - للتحصيل. */
    @GetMapping("/my/receivables")
    public List<SalesInvoiceDto> myReceivables(@AuthenticationPrincipal UserPrincipal principal) {
        Long wh = vanAccessService.findVanOf(principal.getUser()).map(v -> v.getWarehouse().getId()).orElse(null);
        return wh != null ? salesInvoiceService.outstandingByWarehouse(wh) : List.of();
    }

    /** ديون عملاء سيارة معيّنة (للمدير). */
    @GetMapping("/{id}/receivables")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public List<SalesInvoiceDto> receivables(@PathVariable Long id) {
        return salesInvoiceService.outstandingByWarehouse(vanService.findById(id).warehouseId());
    }

    /** تسليم كاش السائق للصندوق. */
    @PostMapping("/{id}/cash-handover")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public CashHandoverDto cashHandover(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                        @Valid @RequestBody CashHandoverRequest request) {
        return vanCashService.handover(id, request, principal.getUser());
    }

    @GetMapping("/{id}/cash-handovers")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public List<CashHandoverDto> cashHandovers(@PathVariable Long id,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return vanCashService.list(id, from, to);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public VanDto findById(@PathVariable Long id) {
        return vanService.findById(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('VAN_MANAGE')")
    public ResponseEntity<VanDto> create(@Valid @RequestBody VanUpsertRequest request) {
        return ResponseEntity.ok(vanService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('VAN_MANAGE')")
    public VanDto update(@PathVariable Long id, @Valid @RequestBody VanUpsertRequest request) {
        return vanService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('VAN_MANAGE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        vanService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/settlement")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public VanSettlementDto settlement(@PathVariable Long id,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return vanService.settlement(id, from, to);
    }

    @PostMapping("/{id}/unload-all")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public VanLoadDto unloadAll(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                @Valid @RequestBody VanUnloadAllRequest request) {
        return vanLoadService.unloadAll(id, request, principal.getUser());
    }

    /** جرد السيارة (تسجيل العجز/الزيادة) ثم تنزيل كل المتبقي إلى المخزن. */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public VanCloseResultDto close(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                   @Valid @RequestBody VanCloseRequest request) {
        return vanLoadService.close(id, request, principal.getUser());
    }

    // ---------- سندات التحميل والتنزيل (Loads) ----------

    @GetMapping("/loads")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public Page<VanLoadDto> loads(@RequestParam(required = false) Long vanId,
                                  @RequestParam(required = false) String loadType,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return vanLoadService.search(vanId, loadType, from, to, PageRequest.of(page, size));
    }

    @GetMapping("/loads/{id}")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public VanLoadDto load(@PathVariable Long id) {
        return vanLoadService.findById(id);
    }

    @PostMapping("/loads")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public VanLoadDto createLoad(@AuthenticationPrincipal UserPrincipal principal,
                                 @Valid @RequestBody VanLoadCreateRequest request) {
        return vanLoadService.create(request, principal.getUser());
    }

    @PostMapping("/loads/{id}/cancel")
    @PreAuthorize("hasAuthority('VAN_LOAD')")
    public VanLoadDto cancelLoad(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return vanLoadService.cancel(id, principal.getUser());
    }
}
