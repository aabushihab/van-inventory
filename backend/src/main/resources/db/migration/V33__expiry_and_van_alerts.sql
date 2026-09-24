-- =====================================================================
-- تواريخ انتهاء الأصناف + تنبيهات السيارات (لم تُحمَّل / لم تُنزَّل)
-- Product expiry dates and van loading/unloading alerts.
-- =====================================================================

-- تاريخ انتهاء الصنف، وكم يوماً قبله يُنبَّه (فارغ = القيمة الافتراضية من إعدادات التنبيهات)
ALTER TABLE products ADD COLUMN expiry_date DATE;
ALTER TABLE products ADD COLUMN expiry_alert_days INT CHECK (expiry_alert_days IS NULL OR expiry_alert_days >= 0);
CREATE INDEX idx_products_expiry ON products(expiry_date) WHERE expiry_date IS NOT NULL;

-- مفتاح فريد لكل حدث تنبيه، حتى لا يتكرر نفس التنبيه (مثلاً: قرب انتهاء صنف معيّن لتاريخ معيّن)
ALTER TABLE notifications ADD COLUMN alert_key VARCHAR(150);
CREATE UNIQUE INDEX uq_notifications_alert_key ON notifications(alert_key) WHERE alert_key IS NOT NULL;

-- إعدادات التنبيهات
ALTER TABLE company_settings ADD COLUMN expiry_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_settings ADD COLUMN default_expiry_alert_days INT NOT NULL DEFAULT 30;
ALTER TABLE company_settings ADD COLUMN van_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE company_settings ADD COLUMN van_no_load_alert_days INT NOT NULL DEFAULT 1;
ALTER TABLE company_settings ADD COLUMN van_no_unload_alert_days INT NOT NULL DEFAULT 3;
