-- تاريخ استحقاق اختياري للفواتير - يُستخدم بتعمير الذمم (أيام التأخر عن الاستحقاق) بدل عمر الفاتورة فقط.
ALTER TABLE sales_invoices ADD COLUMN due_date DATE;
ALTER TABLE purchase_invoices ADD COLUMN due_date DATE;
