-- =====================================================================
-- بيانات أولية: الصلاحيات، الأدوار، مستخدم المدير، فرع ومخزن افتراضي
-- Seed data: permissions, roles, admin user, default branch & warehouse
-- =====================================================================

-- ---------- الصلاحيات (Permissions) ----------
INSERT INTO permissions (code, description) VALUES
    ('USER_MANAGE',            'إدارة المستخدمين'),
    ('ROLE_MANAGE',             'إدارة الأدوار والصلاحيات'),
    ('BRANCH_MANAGE',           'إدارة الفروع'),
    ('WAREHOUSE_MANAGE',        'إدارة المخازن'),
    ('CATEGORY_MANAGE',         'إدارة التصنيفات'),
    ('PRODUCT_VIEW',            'عرض المنتجات'),
    ('PRODUCT_MANAGE',          'إدارة المنتجات'),
    ('STOCK_VIEW',              'عرض المخزون'),
    ('STOCK_ADJUST',            'تعديل كميات المخزون'),
    ('STOCK_TRANSFER',          'نقل بضاعة بين المخازن'),
    ('SUPPLIER_MANAGE',         'إدارة الموردين'),
    ('CUSTOMER_MANAGE',         'إدارة العملاء'),
    ('PURCHASE_INVOICE_VIEW',   'عرض فواتير الشراء'),
    ('PURCHASE_INVOICE_CREATE', 'إنشاء فواتير شراء'),
    ('SALES_INVOICE_VIEW',      'عرض فواتير البيع'),
    ('SALES_INVOICE_CREATE',    'إنشاء فواتير بيع'),
    ('SALES_INVOICE_PRINT',     'طباعة الفواتير'),
    ('NOTIFICATION_VIEW',       'عرض التنبيهات'),
    ('REPORTS_VIEW',            'عرض التقارير'),
    ('DASHBOARD_VIEW',          'عرض لوحة التحكم');

-- ---------- الأدوار (Roles) ----------
INSERT INTO roles (name, name_ar, description, is_system) VALUES
    ('ADMIN',            'مدير النظام',    'صلاحية كاملة على كافة أجزاء النظام', TRUE),
    ('BRANCH_MANAGER',   'مدير فرع',        'إدارة فرع بالكامل ما عدا إدارة المستخدمين والأدوار', TRUE),
    ('WAREHOUSE_KEEPER', 'أمين مخزن',       'إدارة المخزون وفواتير الشراء', TRUE),
    ('CASHIER',          'كاشير / بائع',    'إنشاء وطباعة فواتير البيع', TRUE);

-- ADMIN: كل الصلاحيات
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions;

-- BRANCH_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'BRANCH_MANAGER'), id FROM permissions
WHERE code IN (
    'WAREHOUSE_MANAGE','CATEGORY_MANAGE','PRODUCT_VIEW','PRODUCT_MANAGE',
    'STOCK_VIEW','STOCK_ADJUST','STOCK_TRANSFER','SUPPLIER_MANAGE','CUSTOMER_MANAGE',
    'PURCHASE_INVOICE_VIEW','PURCHASE_INVOICE_CREATE','SALES_INVOICE_VIEW','SALES_INVOICE_CREATE',
    'SALES_INVOICE_PRINT','NOTIFICATION_VIEW','REPORTS_VIEW','DASHBOARD_VIEW'
);

-- WAREHOUSE_KEEPER
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'WAREHOUSE_KEEPER'), id FROM permissions
WHERE code IN (
    'PRODUCT_VIEW','STOCK_VIEW','STOCK_ADJUST','STOCK_TRANSFER',
    'SUPPLIER_MANAGE','PURCHASE_INVOICE_VIEW','PURCHASE_INVOICE_CREATE',
    'NOTIFICATION_VIEW','DASHBOARD_VIEW'
);

-- CASHIER
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'CASHIER'), id FROM permissions
WHERE code IN (
    'PRODUCT_VIEW','STOCK_VIEW','CUSTOMER_MANAGE',
    'SALES_INVOICE_VIEW','SALES_INVOICE_CREATE','SALES_INVOICE_PRINT',
    'NOTIFICATION_VIEW','DASHBOARD_VIEW'
);

-- ---------- فرع ومخزن افتراضي (Default branch & warehouse) ----------
INSERT INTO branches (name, name_en, address, phone, active)
VALUES ('الفرع الرئيسي', 'Main Branch', '', '', TRUE);

INSERT INTO warehouses (branch_id, name, name_en, location, is_default, active)
VALUES ((SELECT id FROM branches WHERE name_en = 'Main Branch'), 'المخزن الرئيسي', 'Main Warehouse', '', TRUE, TRUE);

-- ---------- مستخدم المدير الافتراضي (Default admin user) ----------
-- اسم المستخدم: admin | كلمة المرور: Admin@123  (يجب تغييرها فور أول تسجيل دخول)
INSERT INTO users (username, password_hash, full_name, email, role_id, branch_id, preferred_lang, active)
VALUES (
    'admin',
    '$2b$10$V72c6wE0abWcDN6erH.Ch.ssl7lw.SXbT4Ustd33ik/qPG2LkH1lC',
    'مدير النظام',
    'admin@ceramic-erp.local',
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    (SELECT id FROM branches WHERE name_en = 'Main Branch'),
    'ar',
    TRUE
);

-- ---------- وحدات القياس (Units of measure) ----------
INSERT INTO units (code, name, name_en) VALUES
    ('BOX',  'كرتونة', 'Box'),
    ('SQM',  'متر مربع', 'Square Meter'),
    ('PCS',  'قطعة', 'Piece'),
    ('SET',  'طقم', 'Set'),
    ('ML',   'متر طولي', 'Linear Meter');

-- ---------- تصنيفات أساسية (Base categories) ----------
INSERT INTO categories (name, name_en) VALUES
    ('سيراميك أرضيات', 'Floor Ceramic'),
    ('سيراميك جدران', 'Wall Ceramic'),
    ('بورسلان', 'Porcelain'),
    ('أدوات صحية', 'Sanitary Ware'),
    ('مغاسل وخلاطات', 'Sinks & Faucets'),
    ('إكسسوارات حمامات', 'Bathroom Accessories');
