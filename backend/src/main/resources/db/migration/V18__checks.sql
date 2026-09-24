-- شيكات آجلة: مستلمة من عملاء أو مُصدرة لموردين، بدورة حياة (معلّق/تم صرفه/ارتد/أُلغي) وتاريخ استحقاق.
-- Post-dated checks: received from customers or issued to suppliers, with a lifecycle and due date.
CREATE TABLE checks (
    id                         BIGSERIAL PRIMARY KEY,
    direction                  VARCHAR(10) NOT NULL CHECK (direction IN ('RECEIVED', 'ISSUED')),
    customer_id                BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    supplier_id                BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    party_name                 VARCHAR(150),
    amount                     NUMERIC(14,3) NOT NULL,
    check_number               VARCHAR(60),
    bank_name                  VARCHAR(100),
    due_date                   DATE NOT NULL,
    status                     VARCHAR(10) NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'CLEARED', 'BOUNCED', 'CANCELLED')),
    account_id                 BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    related_sales_invoice_id   BIGINT REFERENCES sales_invoices(id) ON DELETE SET NULL,
    related_purchase_invoice_id BIGINT REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    notes                      VARCHAR(255),
    created_by                 BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at                 TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_checks_status_due ON checks(status, due_date);

INSERT INTO permissions (code, description) VALUES
    ('CHECKS_VIEW',   'عرض الشيكات'),
    ('CHECKS_MANAGE', 'إدارة الشيكات (تسجيل، تصفية، إلغاء)');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('CHECKS_VIEW', 'CHECKS_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('CHECKS_VIEW', 'CHECKS_MANAGE');
