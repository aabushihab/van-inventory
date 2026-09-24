-- إقفال فترة مالية: يمنع تسجيل حركات حساب أو إنهاء جرد بتاريخ ضمن فترة مقفلة (راجع AccountService.recordTransaction
-- وStocktakeService.complete). آخر صف (بأحدث closing_date) هو تاريخ القفل الفعّال؛ لا يوجد تعديل/حذف - سجل تاريخي فقط.
CREATE TABLE fiscal_year_closings (
    id           BIGSERIAL PRIMARY KEY,
    closing_date DATE NOT NULL,
    notes        VARCHAR(255),
    closed_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    closed_at    TIMESTAMP NOT NULL DEFAULT now()
);

INSERT INTO permissions (code, description) VALUES
    ('FISCAL_CLOSING_VIEW',   'عرض سجل إقفال الفترات المالية'),
    ('FISCAL_CLOSING_MANAGE', 'إقفال فترة مالية جديدة');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('FISCAL_CLOSING_VIEW', 'FISCAL_CLOSING_MANAGE');

-- عرض السجل فقط لمدير الفرع - إقفال فترة مالية قرار محصور بالإدارة العليا (ADMIN).
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code = 'FISCAL_CLOSING_VIEW';
