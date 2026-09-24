-- مرتجعات الشراء: يعكس مرتجعات المبيعات تماماً لكن باتجاه المورد (المحل يرجع بضاعة للمورد).
ALTER TABLE purchase_invoice_items ADD COLUMN returned_quantity NUMERIC(14,3) NOT NULL DEFAULT 0;

CREATE TABLE purchase_returns (
    id BIGSERIAL PRIMARY KEY,
    purchase_invoice_id BIGINT NOT NULL REFERENCES purchase_invoices(id),
    return_number VARCHAR(40) NOT NULL UNIQUE,
    total_value NUMERIC(14,3) NOT NULL DEFAULT 0,
    notes VARCHAR(500),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE purchase_return_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_return_id BIGINT NOT NULL REFERENCES purchase_returns(id),
    purchase_invoice_item_id BIGINT NOT NULL REFERENCES purchase_invoice_items(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity NUMERIC(14,3) NOT NULL,
    unit_price NUMERIC(14,3) NOT NULL,
    line_value NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_purchase_returns_invoice ON purchase_returns(purchase_invoice_id);
CREATE INDEX idx_purchase_return_items_return ON purchase_return_items(purchase_return_id);
