-- الموظفون: راتب شهري لكل موظف، تُستخدم بربط مصاريف الرواتب/السلف بالموظف صاحب العلاقة.
-- Employees: a monthly salary per employee, used to link salary/advance expenses to the relevant employee.
CREATE TABLE employees (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    position        VARCHAR(100),
    monthly_salary  NUMERIC(14,3) NOT NULL DEFAULT 0,
    phone           VARCHAR(40),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    branch_id       BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ربط اختياري لمصروف بموظف (إلزامي فقط لفئتي "رواتب"/"سلفة" على مستوى تطبيق الخدمة)، وصورة إيصال/فاتورة
-- المصروف كنص base64 (نفس أسلوب products.image_url) بدل بنية تخزين ملفات منفصلة.
ALTER TABLE expenses ADD COLUMN employee_id BIGINT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN receipt_image TEXT;

INSERT INTO permissions (code, description) VALUES
    ('EMPLOYEE_VIEW',   'عرض الموظفين'),
    ('EMPLOYEE_MANAGE', 'إدارة الموظفين');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions
WHERE code IN ('EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN ('EMPLOYEE_VIEW', 'EMPLOYEE_MANAGE');
