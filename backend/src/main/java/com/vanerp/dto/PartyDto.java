package com.vanerp.dto;

import jakarta.validation.constraints.NotBlank;

/** يُستخدم للموردين والعملاء على حد سواء (Supplier / Customer). */
public record PartyDto(
        Long id,
        @NotBlank String name,
        String phone,
        String email,
        String address,
        String taxNumber,
        boolean active,
        /** للعملاء فقط: سقف الدين والمستحق الحالي. */
        java.math.BigDecimal creditLimit,
        java.math.BigDecimal balance,
        /** للعملاء فقط - بيانات المشتري للفاتورة الإلكترونية (نظام الفوترة الوطني). */
        String idType,
        String idNumber,
        String postalCode,
        String cityCode
) {
    public PartyDto(Long id, String name, String phone, String email, String address, String taxNumber, boolean active,
                    java.math.BigDecimal creditLimit, java.math.BigDecimal balance) {
        this(id, name, phone, email, address, taxNumber, active, creditLimit, balance, null, null, null, null);
    }
}
