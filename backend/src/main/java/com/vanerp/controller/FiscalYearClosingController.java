package com.vanerp.controller;

import com.vanerp.dto.FiscalYearClosingDto;
import com.vanerp.dto.FiscalYearClosingRequest;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.FiscalYearClosingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/fiscal-closings")
@RequiredArgsConstructor
public class FiscalYearClosingController {

    private final FiscalYearClosingService fiscalYearClosingService;

    @GetMapping
    @PreAuthorize("hasAuthority('FISCAL_CLOSING_VIEW')")
    public List<FiscalYearClosingDto> findAll() {
        return fiscalYearClosingService.findAll();
    }

    @GetMapping("/latest")
    @PreAuthorize("hasAuthority('FISCAL_CLOSING_VIEW')")
    public LocalDate latest() {
        return fiscalYearClosingService.latestClosingDate().orElse(null);
    }

    /** إلغاء آخر إقفال (تصحيح إقفال بالخطأ). */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('FISCAL_CLOSING_MANAGE')")
    public ResponseEntity<Void> undo(@PathVariable Long id) {
        fiscalYearClosingService.undoLatest(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('FISCAL_CLOSING_MANAGE')")
    public ResponseEntity<FiscalYearClosingDto> close(@AuthenticationPrincipal UserPrincipal principal,
                                                        @Valid @RequestBody FiscalYearClosingRequest request) {
        return ResponseEntity.ok(fiscalYearClosingService.close(request, principal.getUser()));
    }
}
