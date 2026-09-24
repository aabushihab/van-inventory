-- =====================================================================
-- سيارات التوزيع وتحميلها: كل سيارة لها مخزن خاص بها (نوع VAN) يمثّل البضاعة المحمّلة عليها.
-- التحميل = نقل من مخزن رئيسي إلى مخزن السيارة، والتنزيل = إرجاع المتبقي من السيارة للمخزن.
-- البيع من السيارة = فاتورة بيع عادية مخزنها هو مخزن السيارة.
-- Distribution vans: each van owns a VAN-type warehouse holding its loaded goods.
-- =====================================================================

ALTER TABLE warehouses ADD COLUMN warehouse_type VARCHAR(20) NOT NULL DEFAULT 'MAIN'
    CHECK (warehouse_type IN ('MAIN', 'VAN'));

CREATE TABLE vans (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(30)  NOT NULL UNIQUE,
    name          VARCHAR(120) NOT NULL,
    plate_number  VARCHAR(30),
    driver_name   VARCHAR(120),
    driver_phone  VARCHAR(40),
    salesman_id   BIGINT REFERENCES users(id) ON DELETE SET NULL,
    warehouse_id  BIGINT NOT NULL UNIQUE REFERENCES warehouses(id) ON DELETE RESTRICT,
    notes         VARCHAR(500),
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE van_loads (
    id            BIGSERIAL PRIMARY KEY,
    load_number   VARCHAR(40) NOT NULL UNIQUE,
    van_id        BIGINT NOT NULL REFERENCES vans(id) ON DELETE RESTRICT,
    warehouse_id  BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT, -- المخزن الرئيسي (مصدر التحميل / وجهة التنزيل)
    load_type     VARCHAR(20) NOT NULL CHECK (load_type IN ('LOAD', 'UNLOAD')),
    status        VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    notes         VARCHAR(500),
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    cancelled_at  TIMESTAMP
);

CREATE INDEX idx_van_loads_van_date ON van_loads(van_id, created_at);

CREATE TABLE van_load_items (
    id           BIGSERIAL PRIMARY KEY,
    van_load_id  BIGINT NOT NULL REFERENCES van_loads(id) ON DELETE CASCADE,
    product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     NUMERIC(14,3) NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_van_load_items_load ON van_load_items(van_load_id);

-- ---------- الصلاحيات (Permissions) ----------
INSERT INTO permissions (code, description) VALUES
    ('VAN_VIEW',   'عرض سيارات التوزيع وتسوياتها'),
    ('VAN_MANAGE', 'إدارة سيارات التوزيع'),
    ('VAN_LOAD',   'تحميل وتنزيل بضاعة سيارات التوزيع');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('VAN_VIEW', 'VAN_MANAGE', 'VAN_LOAD');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('VAN_VIEW', 'VAN_MANAGE', 'VAN_LOAD');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'WAREHOUSE_KEEPER'), id FROM permissions
WHERE code IN ('VAN_VIEW', 'VAN_LOAD');

-- ---------- دور مندوب المبيعات (Van salesman role) ----------
INSERT INTO roles (name, name_ar, description, is_system) VALUES
    ('SALESMAN', 'مندوب مبيعات', 'البيع من سيارة التوزيع ومتابعة حمولتها', TRUE);

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'SALESMAN'), id FROM permissions
WHERE code IN (
    'PRODUCT_VIEW','STOCK_VIEW','CUSTOMER_MANAGE',
    'SALES_INVOICE_VIEW','SALES_INVOICE_CREATE','SALES_INVOICE_PRINT',
    'NOTIFICATION_VIEW','DASHBOARD_VIEW','VAN_VIEW'
);
