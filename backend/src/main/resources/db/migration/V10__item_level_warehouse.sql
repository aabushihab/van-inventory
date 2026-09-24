-- يسمح باختيار نفس الصنف من أكثر من مخزن ضمن الفاتورة/العرض نفسه (اختياري لكل سطر؛ إن تُرك فارغاً يُستخدم مخزن الفاتورة الافتراضي)
ALTER TABLE sales_invoice_items ADD COLUMN warehouse_id BIGINT REFERENCES warehouses(id);
ALTER TABLE purchase_invoice_items ADD COLUMN warehouse_id BIGINT REFERENCES warehouses(id);
ALTER TABLE sales_quote_items ADD COLUMN warehouse_id BIGINT REFERENCES warehouses(id);
ALTER TABLE purchase_quote_items ADD COLUMN warehouse_id BIGINT REFERENCES warehouses(id);
