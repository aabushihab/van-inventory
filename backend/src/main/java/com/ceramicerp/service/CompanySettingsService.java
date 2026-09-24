package com.ceramicerp.service;

import com.ceramicerp.dto.CompanySettingsDto;
import com.ceramicerp.model.CompanySettings;
import com.ceramicerp.repository.CompanySettingsRepository;
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
