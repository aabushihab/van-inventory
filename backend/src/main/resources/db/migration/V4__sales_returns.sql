-- مرتجعات المبيعات: إرجاع جزئي أو كلي من فاتورة بيع مؤكدة، مع إعادة الكمية للمخزون.
-- Sales returns: partial or full return from a confirmed sales invoice, restoring quantity to stock.

ALTER TABLE sales_invoice_items ADD COLUMN returned_quantity NUMERIC(14,3) NOT NULL DEFAULT 0;

CREATE TABLE sales_returns (
    id                BIGSERIAL PRIMARY KEY,
    sales_invoice_id  BIGINT NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
    return_number     VARCHAR(40) NOT NULL UNIQUE,
    total_value       NUMERIC(14,3) NOT NULL DEFAULT 0,
    notes             VARCHAR(500),
    created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sales_return_items (
    id                    BIGSERIAL PRIMARY KEY,
    sales_return_id       BIGINT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
    sales_invoice_item_id BIGINT NOT NULL REFERENCES sales_invoice_items(id) ON DELETE RESTRICT,
    product_id            BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity              NUMERIC(14,3) NOT NULL,
    unit_price            NUMERIC(14,3) NOT NULL,
    line_value            NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_sales_returns_invoice ON sales_returns(sales_invoice_id);
CREATE INDEX idx_sales_returns_created_at ON sales_returns(created_at);
CREATE INDEX idx_sales_return_items_return ON sales_return_items(sales_return_id);
