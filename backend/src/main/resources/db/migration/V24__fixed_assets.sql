-- أصول ثابتة (سيارة، معدات...) مع إهلاك يُحسب حياً بمعادلة (straight-line) بدل جدول قيود إهلاك منفصل.
CREATE TABLE fixed_assets (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(150) NOT NULL,
    category           VARCHAR(100),
    purchase_date      DATE NOT NULL,
    purchase_cost      NUMERIC(14,3) NOT NULL,
    salvage_value      NUMERIC(14,3) NOT NULL DEFAULT 0,
    useful_life_months INT NOT NULL,
    account_id         BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    branch_id          BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    status             VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPOSED')),
    disposed_date      DATE,
    notes              VARCHAR(255),
    created_by         BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);

-- توسيع أنواع مصدر حركة الحساب لتشمل شراء/بيع أصل ثابت (تصنيف "استثماري" بقائمة التدفقات النقدية).
ALTER TABLE account_transactions DROP CONSTRAINT account_transactions_source_type_check;
ALTER TABLE account_transactions ADD CONSTRAINT account_transactions_source_type_check
    CHECK (source_type IN ('SALES_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE', 'CAPITAL_IN', 'CAPITAL_OUT',
                            'CHECK_CLEARED', 'MANUAL', 'TRANSFER', 'FIXED_ASSET_PURCHASE', 'FIXED_ASSET_SALE'));

INSERT INTO permissions (code, description) VALUES
    ('FIXED_ASSETS_VIEW',   'عرض الأصول الثابتة'),
    ('FIXED_ASSETS_MANAGE', 'إدارة الأصول الثابتة (إضافة، تعديل، تصفية)');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('FIXED_ASSETS_VIEW', 'FIXED_ASSETS_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('FIXED_ASSETS_VIEW', 'FIXED_ASSETS_MANAGE');
