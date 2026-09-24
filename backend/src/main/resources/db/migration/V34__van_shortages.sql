-- =====================================================================
-- عجز السائقين: كل جرد سيارة فيه نقص يُسجَّل كعجز على السائق، ويُحسم لاحقاً
-- بخصم من الراتب أو دفع نقدي أو مسامحة.
-- Driver shortages recorded from van counts and settled by salary deduction, cash, or waiver.
-- =====================================================================

-- طريقة تسعير العجز الافتراضية (سعر البيع أو سعر التكلفة) وحد مبلغ التنبيه
ALTER TABLE company_settings ADD COLUMN shortage_pricing VARCHAR(10) NOT NULL DEFAULT 'SALE'
    CHECK (shortage_pricing IN ('SALE', 'COST'));
ALTER TABLE company_settings ADD COLUMN shortage_alert_threshold NUMERIC(14,3) NOT NULL DEFAULT 0;

CREATE TABLE van_shortages (
    id                  BIGSERIAL PRIMARY KEY,
    van_id              BIGINT NOT NULL REFERENCES vans(id) ON DELETE RESTRICT,
    driver_employee_id  BIGINT REFERENCES employees(id) ON DELETE SET NULL,
    driver_name         VARCHAR(150),
    salesman_id         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    pricing             VARCHAR(10) NOT NULL CHECK (pricing IN ('SALE', 'COST')),
    total_value         NUMERIC(14,3) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'SALARY_DEDUCTED', 'PAID', 'WAIVED')),
    salary_year         INT,
    salary_month        INT CHECK (salary_month IS NULL OR salary_month BETWEEN 1 AND 12),
    account_id          BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    settlement_note     VARCHAR(500),
    settled_at          TIMESTAMP,
    settled_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes               VARCHAR(500),
    created_by          BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_van_shortages_van ON van_shortages(van_id, created_at);
CREATE INDEX idx_van_shortages_driver ON van_shortages(driver_employee_id, status);
CREATE INDEX idx_van_shortages_salary ON van_shortages(salary_year, salary_month) WHERE status = 'SALARY_DEDUCTED';

CREATE TABLE van_shortage_items (
    id           BIGSERIAL PRIMARY KEY,
    shortage_id  BIGINT NOT NULL REFERENCES van_shortages(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(14,3) NOT NULL,
    line_value   NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_van_shortage_items_shortage ON van_shortage_items(shortage_id);

-- تحصيل العجز نقداً يُسجَّل كحركة داخلة على الصندوق
ALTER TABLE account_transactions DROP CONSTRAINT account_transactions_source_type_check;
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_source_type_check
    CHECK (source_type IN ('SALES_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE', 'CAPITAL_IN', 'CAPITAL_OUT',
                            'CHECK_CLEARED', 'MANUAL', 'TRANSFER', 'FIXED_ASSET_PURCHASE', 'FIXED_ASSET_SALE',
                            'VAN_SHORTAGE'));
