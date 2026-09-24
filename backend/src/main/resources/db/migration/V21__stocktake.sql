-- جرد فعلي منظّم: جلسة جرد لمخزن معيّن، تُقارَن فيها الكمية النظرية بالنظام مع الكمية المعدودة فعلياً،
-- وعند الإنهاء تُطبَّق الفروقات على المخزون تلقائياً عبر آلية تعديل المخزون الموجودة.
CREATE TABLE stocktake_sessions (
    id             BIGSERIAL PRIMARY KEY,
    warehouse_id   BIGINT NOT NULL REFERENCES warehouses(id),
    session_date   DATE NOT NULL,
    status         VARCHAR(10) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'COMPLETED')),
    notes          VARCHAR(500),
    created_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    completed_at   TIMESTAMP
);

CREATE TABLE stocktake_lines (
    id                BIGSERIAL PRIMARY KEY,
    session_id        BIGINT NOT NULL REFERENCES stocktake_sessions(id) ON DELETE CASCADE,
    product_id        BIGINT NOT NULL REFERENCES products(id),
    system_quantity   NUMERIC(14,3) NOT NULL,
    counted_quantity  NUMERIC(14,3),
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_stocktake_lines_session ON stocktake_lines(session_id);

INSERT INTO permissions (code, description) VALUES
    ('STOCKTAKE_VIEW',   'عرض جلسات الجرد'),
    ('STOCKTAKE_MANAGE', 'إدارة الجرد الفعلي (بدء، عدّ، إنهاء)');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('STOCKTAKE_VIEW', 'STOCKTAKE_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('STOCKTAKE_VIEW', 'STOCKTAKE_MANAGE');
