-- ربط اختياري (nullable) بحساب نقدي/بنكي فعلي - عند تحديده تُنشأ حركة حساب مقابلة تلقائياً.
-- Optional link to a real cash/bank account - when set, a matching account transaction is created automatically.
ALTER TABLE expenses ADD COLUMN account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE sales_invoice_payments ADD COLUMN account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE purchase_invoice_payments ADD COLUMN account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL;
