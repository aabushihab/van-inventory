-- يسجل تكلفة شراء الوحدة وقت البيع فعلياً (لا يتغيّر لاحقاً حتى لو تغيّر سعر شراء المنتج)، بحيث تقارير الأرباح
-- التاريخية تبقى ثابتة ولا تتأثر بتغيّر أسعار الشراء اللاحقة. القيمة الافتراضية للسجلات القديمة هي سعر الشراء
-- الحالي للمنتج (أفضل تقدير متاح لأن التكلفة الفعلية وقتها لم تُسجَّل من قبل).
ALTER TABLE sales_invoice_items ADD COLUMN unit_cost NUMERIC(14,3) NOT NULL DEFAULT 0;

UPDATE sales_invoice_items sii
SET unit_cost = p.purchase_price
FROM products p
WHERE p.id = sii.product_id;
