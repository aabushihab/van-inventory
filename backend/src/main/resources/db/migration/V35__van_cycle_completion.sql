-- =====================================================================
-- استكمال دورة التوزيع:
--  1) تسليم كاش السائق آخر اليوم (والفرق يصير عجز كاش على السائق)
--  2) البيع بالكرتونة أو بالحبة (سعر كرتونة اختياري لكل صنف)
--  3) سقف الدين للعميل
--  4) طلبات التحميل من السائق وموافقة المدير
-- =====================================================================

-- ---------- البيع بالكرتونة / بالحبة ----------
ALTER TABLE products ADD COLUMN carton_price NUMERIC(14,3);

ALTER TABLE sales_invoice_items ADD COLUMN pack_type VARCHAR(10) NOT NULL DEFAULT 'UNIT'
    CHECK (pack_type IN ('UNIT', 'CARTON'));
ALTER TABLE sales_invoice_items ADD COLUMN pack_quantity NUMERIC(14,3);
ALTER TABLE sales_invoice_items ADD COLUMN pack_size NUMERIC(12,2);
UPDATE sales_invoice_items SET pack_quantity = quantity, pack_size = 1 WHERE pack_quantity IS NULL;

-- ---------- سقف الدين ----------
ALTER TABLE customers ADD COLUMN credit_limit NUMERIC(14,3) CHECK (credit_limit IS NULL OR credit_limit >= 0);

-- ---------- عجز كاش (بالإضافة لعجز البضاعة) ----------
ALTER TABLE van_shortages ADD COLUMN shortage_type VARCHAR(10) NOT NULL DEFAULT 'GOODS'
    CHECK (shortage_type IN ('GOODS', 'CASH'));

-- ---------- تسليم كاش السائق ----------
CREATE TABLE van_cash_handovers (
    id              BIGSERIAL PRIMARY KEY,
    van_id          BIGINT NOT NULL REFERENCES vans(id) ON DELETE RESTRICT,
    driver_name     VARCHAR(150),
    expected_amount NUMERIC(14,3) NOT NULL,
    handed_amount   NUMERIC(14,3) NOT NULL,
    difference      NUMERIC(14,3) NOT NULL,          -- موجب = زيادة، سالب = عجز
    to_account_id   BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    shortage_id     BIGINT REFERENCES van_shortages(id) ON DELETE SET NULL,
    notes           VARCHAR(500),
    created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_van_cash_handovers_van ON van_cash_handovers(van_id, created_at);

-- ---------- طلبات التحميل ----------
CREATE TABLE van_load_requests (
    id             BIGSERIAL PRIMARY KEY,
    van_id         BIGINT NOT NULL REFERENCES vans(id) ON DELETE RESTRICT,
    requested_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    for_date       DATE NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    notes          VARCHAR(500),
    response_note  VARCHAR(500),
    van_load_id    BIGINT REFERENCES van_loads(id) ON DELETE SET NULL,
    decided_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    decided_at     TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_van_load_requests_status ON van_load_requests(status, created_at);

CREATE TABLE van_load_request_items (
    id          BIGSERIAL PRIMARY KEY,
    request_id  BIGINT NOT NULL REFERENCES van_load_requests(id) ON DELETE CASCADE,
    product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    NUMERIC(14,3) NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_van_load_request_items_request ON van_load_request_items(request_id);
