package com.vanerp.model;

/** حالة عجز السائق: مستحق، خُصم من الراتب، دُفع نقداً، أو سُومح به. */
public enum ShortageStatus {
    PENDING,
    SALARY_DEDUCTED,
    PAID,
    WAIVED
}
