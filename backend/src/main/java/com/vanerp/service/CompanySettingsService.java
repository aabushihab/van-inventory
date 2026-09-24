package com.vanerp.service;

import com.vanerp.dto.CompanySettingsDto;
import com.vanerp.model.CompanySettings;
import com.vanerp.repository.CompanySettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * إعدادات الشركة (الاسم، الرقم الضريبي...) — تُقرأ من قاعدة البيانات وتُعرض/تُعدَّل من شاشة الإعدادات، وتُستخدم
 * في شاشة الدخول والقائمة الجانبية وطباعة كل الفواتير وعروض الأسعار. عند أول استخدام (لا يوجد سجل بعد) يُنشأ
 * سجل مبدئي من القيم الافتراضية الحالية في application.yml/متغيرات البيئة حتى لا تنقطع الإعدادات القديمة.
 */
@Service
@RequiredArgsConstructor
public class CompanySettingsService {

    private final CompanySettingsRepository companySettingsRepository;

    @Value("${app.company.name}")
    private String defaultName;
    @Value("${app.company.name-en}")
    private String defaultNameEn;
    @Value("${app.company.tax-number}")
    private String defaultTaxNumber;
    @Value("${app.company.phone}")
    private String defaultPhone;
    @Value("${app.company.address}")
    private String defaultAddress;
    @Value("${app.company.currency}")
    private String defaultCurrency;

    @Transactional
    public CompanySettings getOrCreate() {
        return companySettingsRepository.findAll().stream().findFirst()
                .orElseGet(() -> companySettingsRepository.save(CompanySettings.builder()
                        .name(defaultName).nameEn(defaultNameEn).taxNumber(defaultTaxNumber)
                        .phone(defaultPhone).address(defaultAddress).currency(defaultCurrency)
                        .build()));
    }

    @Transactional
    public com.vanerp.dto.AlertSettingsDto getAlertSettings() {
        CompanySettings s = getOrCreate();
        return new com.vanerp.dto.AlertSettingsDto(s.isExpiryAlertsEnabled(), s.getDefaultExpiryAlertDays(),
                s.isVanAlertsEnabled(), s.getVanNoLoadAlertDays(), s.getVanNoUnloadAlertDays(),
                s.getShortagePricing(), s.getShortageAlertThreshold());
    }

    @Transactional
    public com.vanerp.dto.AlertSettingsDto updateAlertSettings(com.vanerp.dto.AlertSettingsDto request) {
        CompanySettings s = getOrCreate();
        s.setExpiryAlertsEnabled(request.expiryAlertsEnabled());
        s.setDefaultExpiryAlertDays(request.defaultExpiryAlertDays());
        s.setVanAlertsEnabled(request.vanAlertsEnabled());
        s.setVanNoLoadAlertDays(request.vanNoLoadAlertDays());
        s.setVanNoUnloadAlertDays(request.vanNoUnloadAlertDays());
        if (request.shortagePricing() != null) s.setShortagePricing(request.shortagePricing());
        if (request.shortageAlertThreshold() != null) s.setShortageAlertThreshold(request.shortageAlertThreshold());
        s.setUpdatedAt(LocalDateTime.now());
        companySettingsRepository.save(s);
        return getAlertSettings();
    }

    @Transactional
    public com.vanerp.dto.SalesSettingsDto getSalesSettings() {
        CompanySettings s = getOrCreate();
        return new com.vanerp.dto.SalesSettingsDto(s.isChecksEnabled(), s.isDriverChecksEnabled());
    }

    @Transactional
    public com.vanerp.dto.SalesSettingsDto updateSalesSettings(com.vanerp.dto.SalesSettingsDto request) {
        CompanySettings s = getOrCreate();
        s.setChecksEnabled(request.checksEnabled());
        s.setDriverChecksEnabled(request.driverChecksEnabled());
        s.setUpdatedAt(LocalDateTime.now());
        companySettingsRepository.save(s);
        return getSalesSettings();
    }

    @Transactional
    public CompanySettingsDto get() {
        return toDto(getOrCreate());
    }

    @Transactional
    public CompanySettingsDto update(CompanySettingsDto request) {
        CompanySettings settings = getOrCreate();
        settings.setName(request.name());
        settings.setNameEn(request.nameEn());
        settings.setTaxNumber(request.taxNumber());
        settings.setPhone(request.phone());
        settings.setAddress(request.address());
        settings.setCurrency(request.currency() != null && !request.currency().isBlank() ? request.currency() : "JOD");
        settings.setLoginBackgroundImage(request.loginBackgroundImage());
        settings.setLogo(request.logo());
        settings.setUpdatedAt(LocalDateTime.now());
        return toDto(companySettingsRepository.save(settings));
    }

    private CompanySettingsDto toDto(CompanySettings s) {
        return new CompanySettingsDto(s.getName(), s.getNameEn(), s.getTaxNumber(), s.getPhone(), s.getAddress(), s.getCurrency(), s.getLoginBackgroundImage(), s.getLogo());
    }
}
