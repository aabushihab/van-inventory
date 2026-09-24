-- مصاريف المحل التشغيلية (كهرباء، مياه، إيجار، صيانة...) - تُخصم من الربح بالتقرير المالي
-- Operating shop expenses (electricity, water, rent, maintenance...) - deducted from profit in the financial report.
CREATE TABLE expenses (
    id            BIGSERIAL PRIMARY KEY,
    category      VARCHAR(60) NOT NULL,
    amount        NUMERIC(14,3) NOT NULL,
    expense_date  DATE NOT NULL,
    notes         VARCHAR(500),
    branch_id     BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);

INSERT INTO permissions (code, description) VALUES
    ('EXPENSE_VIEW',   'عرض مصاريف المحل'),
    ('EXPENSE_MANAGE', 'إدارة مصاريف المحل');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('EXPENSE_VIEW', 'EXPENSE_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('EXPENSE_VIEW', 'EXPENSE_MANAGE');
