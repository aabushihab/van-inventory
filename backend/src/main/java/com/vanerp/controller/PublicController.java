package com.vanerp.controller;

import com.vanerp.service.CompanySettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * معلومات عامة لا تتطلب تسجيل دخول (اسم المحل لعرضه في شاشة الدخول والقائمة الجانبية).
 * Public info that doesn't require login (company name, shown on the login screen and sidebar).
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final CompanySettingsService companySettingsService;

    @GetMapping("/company-info")
    public Map<String, String> companyInfo() {
        var settings = companySettingsService.get();
        return Map.of(
                "name", settings.name() != null ? settings.name() : "",
                "nameEn", settings.nameEn() != null ? settings.nameEn() : "",
                "loginBackgroundImage", settings.loginBackgroundImage() != null ? settings.loginBackgroundImage() : "",
                "logo", settings.logo() != null ? settings.logo() : ""
        );
    }
}
