-- تعويض المورد عن بضاعة تالفة: يعيد كمية للمخزون ويُخصم من قيمة الخسارة المسجّلة على حركة التلف الأصلية.
-- Supplier compensation for damaged goods: restores stock quantity and reduces the recorded loss on the original damage movement.
ALTER TABLE stock_movements ADD COLUMN compensated_quantity NUMERIC(14,3) NOT NULL DEFAULT 0;
