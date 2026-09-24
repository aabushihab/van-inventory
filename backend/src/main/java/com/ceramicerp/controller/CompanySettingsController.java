package com.ceramicerp.controller;

import com.ceramicerp.dto.CompanySettingsDto;
import com.ceramicerp.service.CompanySettingsService;
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

    @GetMapping
    public CompanySettingsDto get() {
        return companySettingsService.get();
    }

    @PutMapping
    public CompanySettingsDto update(@Valid @RequestBody CompanySettingsDto request) {
        return companySettingsService.update(request);
    }
}
