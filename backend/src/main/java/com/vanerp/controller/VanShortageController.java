package com.vanerp.controller;

import com.vanerp.dto.DriverShortageSummaryDto;
import com.vanerp.dto.ShortageSettleRequest;
import com.vanerp.dto.VanShortageDto;
import com.vanerp.security.UserPrincipal;
import com.vanerp.service.VanShortageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/van-shortages")
@RequiredArgsConstructor
public class VanShortageController {

    private final VanShortageService vanShortageService;

    @GetMapping
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public Page<VanShortageDto> search(@RequestParam(required = false) Long vanId,
                                       @RequestParam(required = false) Long driverId,
                                       @RequestParam(required = false) String status,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return vanShortageService.search(vanId, driverId, status, from, to, PageRequest.of(page, size));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public List<DriverShortageSummaryDto> summary() {
        return vanShortageService.summaryByDriver();
    }

    /** خصومات العجز على رواتب شهر - لشاشة الموظفين. */
    @GetMapping("/salary-deductions")
    @PreAuthorize("hasAuthority('EMPLOYEE_VIEW') or hasAuthority('VAN_VIEW')")
    public Map<Long, BigDecimal> salaryDeductions(@RequestParam int year, @RequestParam int month) {
        return vanShortageService.salaryDeductions(year, month);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('VAN_VIEW')")
    public VanShortageDto findById(@PathVariable Long id) {
        return vanShortageService.findById(id);
    }

    @PostMapping("/{id}/settle")
    @PreAuthorize("hasAuthority('VAN_MANAGE')")
    public VanShortageDto settle(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id,
                                 @Valid @RequestBody ShortageSettleRequest request) {
        return vanShortageService.settle(id, request, principal.getUser());
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('VAN_MANAGE')")
    public VanShortageDto reopen(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        return vanShortageService.reopen(id, principal.getUser());
    }
}
