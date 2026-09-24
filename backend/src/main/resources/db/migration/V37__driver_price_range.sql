-- نطاق سعر البيع المسموح للسائق لكل صنف (للوحدة الأساسية) - فارغ = بدون حد.
-- Allowed per-unit sale price range for drivers (empty = no limit).
ALTER TABLE products ADD COLUMN min_sale_price NUMERIC(14,3) CHECK (min_sale_price IS NULL OR min_sale_price >= 0);
ALTER TABLE products ADD COLUMN max_sale_price NUMERIC(14,3) CHECK (max_sale_price IS NULL OR max_sale_price >= 0);
