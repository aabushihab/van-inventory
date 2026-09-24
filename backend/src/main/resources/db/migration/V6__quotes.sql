-- عروض الأسعار: مستند غير مؤثر على المخزون، يتحول عند التأكيد إلى فاتورة فعلية (بيع أو شراء) وينقص/يزيد المخزون حينها.
-- Quotes: a document with no stock impact until confirmed, at which point it converts into a real invoice (sales or purchase).

CREATE TABLE sales_quotes (
    id                    BIGSERIAL PRIMARY KEY,
    quote_number          VARCHAR(40) NOT NULL UNIQUE,
    customer_id           BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    warehouse_id          BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    branch_id             BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED
    subtotal              NUMERIC(14,3) NOT NULL DEFAULT 0,
    tax_total              NUMERIC(14,3) NOT NULL DEFAULT 0,
    discount_total        NUMERIC(14,3) NOT NULL DEFAULT 0,
    grand_total           NUMERIC(14,3) NOT NULL DEFAULT 0,
    notes                 VARCHAR(500),
    converted_invoice_id  BIGINT REFERENCES sales_invoices(id) ON DELETE SET NULL,
    created_by            BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sales_quote_items (
    id              BIGSERIAL PRIMARY KEY,
    sales_quote_id  BIGINT NOT NULL REFERENCES sales_quotes(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        NUMERIC(14,3) NOT NULL,
    unit_price      NUMERIC(14,3) NOT NULL,
    tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(14,3) NOT NULL DEFAULT 0,
    line_total      NUMERIC(14,3) NOT NULL
);

CREATE TABLE purchase_quotes (
    id                    BIGSERIAL PRIMARY KEY,
    quote_number          VARCHAR(40) NOT NULL UNIQUE,
    supplier_id           BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_id          BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    branch_id             BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    status                VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    subtotal              NUMERIC(14,3) NOT NULL DEFAULT 0,
    tax_total             NUMERIC(14,3) NOT NULL DEFAULT 0,
    discount_total        NUMERIC(14,3) NOT NULL DEFAULT 0,
    grand_total           NUMERIC(14,3) NOT NULL DEFAULT 0,
    notes                 VARCHAR(500),
    converted_invoice_id  BIGINT REFERENCES purchase_invoices(id) ON DELETE SET NULL,
    created_by            BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE purchase_quote_items (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_quote_id   BIGINT NOT NULL REFERENCES purchase_quotes(id) ON DELETE CASCADE,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity            NUMERIC(14,3) NOT NULL,
    unit_price          NUMERIC(14,3) NOT NULL,
    tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount            NUMERIC(14,3) NOT NULL DEFAULT 0,
    line_total          NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_sales_quote_items_quote ON sales_quote_items(sales_quote_id);
CREATE INDEX idx_purchase_quote_items_quote ON purchase_quote_items(purchase_quote_id);
CREATE INDEX idx_sales_quotes_created_at ON sales_quotes(created_at);
CREATE INDEX idx_purchase_quotes_created_at ON purchase_quotes(created_at);
