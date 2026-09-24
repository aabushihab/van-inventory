package com.vanerp.controller;

import com.vanerp.dto.CompanySettingsDto;
import com.vanerp.service.CompanySettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings/company")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_MANAGE')")
public class CompanySettingsController {

    private final CompanySettingsService companySettingsService;
    private final com.vanerp.service.AlertService alertService;

    @GetMapping
    public CompanySettingsDto get() {
        return companySettingsService.get();
    }

    @GetMapping("/sales")
    public com.vanerp.dto.SalesSettingsDto salesSettings() {
        return companySettingsService.getSalesSettings();
    }

    @PutMapping("/sales")
    public com.vanerp.dto.SalesSettingsDto updateSalesSettings(@RequestBody com.vanerp.dto.SalesSettingsDto request) {
        return companySettingsService.updateSalesSettings(request);
    }

    @GetMapping("/alerts")
    public com.vanerp.dto.AlertSettingsDto alertSettings() {
        return companySettingsService.getAlertSettings();
    }

    @PutMapping("/alerts")
    public com.vanerp.dto.AlertSettingsDto updateAlertSettings(@Valid @RequestBody com.vanerp.dto.AlertSettingsDto request) {
        return companySettingsService.updateAlertSettings(request);
    }

    /** تشغيل فحص التنبيهات الآن (انتهاء الأصناف + السيارات) بدل انتظار موعده اليومي. يعيد عدد التنبيهات الجديدة. */
    @PostMapping("/alerts/run")
    public java.util.Map<String, Integer> runAlerts() {
        return java.util.Map.of("expiry", alertService.checkAllExpiry(), "vans", alertService.checkVans());
    }

    @PutMapping
    public CompanySettingsDto update(@Valid @RequestBody CompanySettingsDto request) {
        return companySettingsService.update(request);
    }
}
