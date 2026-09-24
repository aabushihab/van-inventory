package com.ceramicerp.controller;

import com.ceramicerp.dto.FiscalYearClosingDto;
import com.ceramicerp.dto.FiscalYearClosingRequest;
import com.ceramicerp.security.UserPrincipal;
import com.ceramicerp.service.FiscalYearClosingService;
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

    @PostMapping
    @PreAuthorize("hasAuthority('FISCAL_CLOSING_MANAGE')")
    public ResponseEntity<FiscalYearClosingDto> close(@AuthenticationPrincipal UserPrincipal principal,
                                                        @Valid @RequestBody FiscalYearClosingRequest request) {
        return ResponseEntity.ok(fiscalYearClosingService.close(request, principal.getUser()));
    }
}
