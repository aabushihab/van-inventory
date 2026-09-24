-- ============================================================
-- سكربت تصفير كامل بيانات النظام (حذف كل شيء عدا هيكل الجداول نفسه)
-- تجنّب حذف flyway_schema_history - جدول داخلي لتتبع التحديثات، حذفه يكسر أي تحديث مستقبلي للنظام
-- الترتيب هنا مهم بسبب علاقات المفاتيح الأجنبية (FK) - الجداول الفرعية تُحذف أولاً ثم الأساسية
-- ============================================================

DELETE FROM audit_logs;
DELETE FROM notifications;

DELETE FROM purchase_return_items;
DELETE FROM sales_return_items;
DELETE FROM purchase_invoice_payments;
DELETE FROM sales_invoice_payments;
DELETE FROM stock_movements;
DELETE FROM van_load_items;
DELETE FROM van_loads;

DELETE FROM purchase_returns;
DELETE FROM sales_returns;

DELETE FROM purchase_quote_items;
DELETE FROM sales_quote_items;
DELETE FROM purchase_invoice_items;
DELETE FROM sales_invoice_items;

DELETE FROM stock_items;

DELETE FROM purchase_quotes;
DELETE FROM sales_quotes;

DELETE FROM purchase_invoices;
DELETE FROM sales_invoices;

DELETE FROM role_permissions;

DELETE FROM products;
DELETE FROM customers;
DELETE FROM suppliers;
DELETE FROM vans;
DELETE FROM warehouses;
DELETE FROM categories;
DELETE FROM branches;
-- ملاحظة: الوحدات (units) مستثناة عمداً من الحذف بناءً على طلب صريح - تبقى محفوظة.

DELETE FROM users;
DELETE FROM roles;
DELETE FROM permissions;

DELETE FROM company_settings;
