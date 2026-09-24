package com.vanerp.pdf;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * نموذج بيانات طباعة سند قبض راتب/سلفة لموظف.
 * Print data model for an employee salary/advance receipt voucher.
 */
@Getter
@Builder
public class VoucherPrintModel {
    private String voucherNumber;
    private String categoryLabel;
    private String employeeName;
    private String employeePosition;
    private BigDecimal amount;
    private String currency;
    private LocalDate date;
    private String notes;
    private String recordedByName;

    private String companyName;
    private String companyNameEn;
    private String companyAddress;
    private String companyPhone;
}
