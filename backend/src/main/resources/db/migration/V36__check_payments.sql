-- =====================================================================
-- البيع والتحصيل بالشيكات (يفعّلها المدير): الشيك يُسجَّل في شاشة الشيكات مرتبطاً بفاتورته ودفعته،
-- ويدخل الحساب عند التصفية فقط، وإن رجع أو أُلغي تعود قيمته ديناً على الفاتورة.
-- =====================================================================

ALTER TABLE company_settings ADD COLUMN checks_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE company_settings ADD COLUMN driver_checks_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- صورة الشيك، والدفعة التي سُدّدت به، والسيارة التي استلمته
ALTER TABLE checks ADD COLUMN image TEXT;
ALTER TABLE checks ADD COLUMN related_sales_payment_id BIGINT REFERENCES sales_invoice_payments(id) ON DELETE SET NULL;
ALTER TABLE checks ADD COLUMN van_id BIGINT REFERENCES vans(id) ON DELETE SET NULL;
CREATE INDEX idx_checks_sales_payment ON checks(related_sales_payment_id);
