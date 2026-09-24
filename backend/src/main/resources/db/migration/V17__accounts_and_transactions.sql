-- حسابات نقدية/بنكية فعلية (كاش، بنك) وسجل حركاتها - لمعرفة الرصيد الفعلي لحظياً بدل حساب مجمّع فقط.
-- Actual cash/bank accounts and their transaction ledger - to know the real balance live.
CREATE TABLE accounts (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    type             VARCHAR(10) NOT NULL CHECK (type IN ('CASH', 'BANK')),
    branch_id        BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    opening_balance  NUMERIC(14,3) NOT NULL DEFAULT 0,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

-- سجل كل حركة كاش داخلة/خارجة من حساب: دفعات فواتير، مصاريف، شيكات صُرفت، رأس مال (سحب/إضافة)، أو حركة يدوية.
CREATE TABLE account_transactions (
    id               BIGSERIAL PRIMARY KEY,
    account_id       BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    direction        VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    amount           NUMERIC(14,3) NOT NULL,
    transaction_date DATE NOT NULL,
    source_type      VARCHAR(20) NOT NULL CHECK (source_type IN
                        ('SALES_PAYMENT', 'PURCHASE_PAYMENT', 'EXPENSE', 'CAPITAL_IN', 'CAPITAL_OUT', 'CHECK_CLEARED', 'MANUAL')),
    source_id        BIGINT,
    notes            VARCHAR(255),
    created_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_transactions_account_date ON account_transactions(account_id, transaction_date);
CREATE INDEX idx_account_transactions_source ON account_transactions(source_type, source_id);

INSERT INTO permissions (code, description) VALUES
    ('ACCOUNTS_VIEW',   'عرض الحسابات النقدية والبنكية'),
    ('ACCOUNTS_MANAGE', 'إدارة الحسابات النقدية والبنكية وحركاتها');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('ACCOUNTS_VIEW', 'ACCOUNTS_MANAGE');
