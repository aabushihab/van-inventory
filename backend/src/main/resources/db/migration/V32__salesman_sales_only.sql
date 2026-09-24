-- مندوب المبيعات/السائق: البيع من سيارته فقط - فواتير البيع + ما تحتاجه شاشة الفاتورة (الأصناف والعملاء).
-- حمولة سيارته تظهر له من شاشة "سيارتي" (لا تحتاج صلاحية المخزون).
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'SALESMAN');

INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'SALESMAN'), id FROM permissions
WHERE code IN ('PRODUCT_VIEW', 'CUSTOMER_MANAGE', 'SALES_INVOICE_VIEW', 'SALES_INVOICE_CREATE', 'SALES_INVOICE_PRINT');
