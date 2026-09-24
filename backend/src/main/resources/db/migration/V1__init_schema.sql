-- =====================================================================
-- نظام المخازن والمبيعات وتحميل سيارات التوزيع - المخطط الأساسي
-- Warehouse, Sales & Van Distribution ERP - Initial Schema
-- =====================================================================

-- ---------- الصلاحيات والأدوار (Permissions & Roles / RBAC) ----------
CREATE TABLE permissions (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255)
);

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    name_ar     VARCHAR(120),
    description VARCHAR(255),
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ---------- الفروع والمخازن (Branches & Warehouses) ----------
CREATE TABLE branches (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    name_en    VARCHAR(150),
    address    VARCHAR(255),
    phone      VARCHAR(40),
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
    id         BIGSERIAL PRIMARY KEY,
    branch_id  BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    name       VARCHAR(150) NOT NULL,
    name_en    VARCHAR(150),
    location   VARCHAR(255),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- المستخدمون (Users) ----------
CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    username       VARCHAR(60) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150),
    phone          VARCHAR(40),
    role_id        BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id      BIGINT REFERENCES branches(id) ON DELETE SET NULL,
    preferred_lang VARCHAR(5) NOT NULL DEFAULT 'ar',
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMP,
    created_at     TIMESTAMP NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- وحدات القياس والتصنيفات (Units & Categories) ----------
CREATE TABLE units (
    id      BIGSERIAL PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE,
    name    VARCHAR(60) NOT NULL,
    name_en VARCHAR(60)
);

CREATE TABLE categories (
    id        BIGSERIAL PRIMARY KEY,
    name      VARCHAR(120) NOT NULL,
    name_en   VARCHAR(120),
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- المنتجات (Products) ----------
CREATE TABLE products (
    id                 BIGSERIAL PRIMARY KEY,
    sku                VARCHAR(60) NOT NULL UNIQUE,
    barcode            VARCHAR(60) UNIQUE,
    name               VARCHAR(200) NOT NULL,
    name_en            VARCHAR(200),
    category_id        BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    unit_id            BIGINT NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    units_per_carton   NUMERIC(12,2),       -- عدد الحبات في الكرتونة
    purchase_price     NUMERIC(14,3) NOT NULL DEFAULT 0,
    sale_price         NUMERIC(14,3) NOT NULL DEFAULT 0,
    tax_rate           NUMERIC(5,2) NOT NULL DEFAULT 0,   -- نسبة الضريبة %
    min_stock_threshold NUMERIC(14,3) NOT NULL DEFAULT 0, -- حد التنبيه لنقص المخزون
    image_url          VARCHAR(500),
    active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products USING gin (to_tsvector('simple', name));

-- ---------- المخزون وحركاته (Stock & Movements) ----------
CREATE TABLE stock_items (
    id           BIGSERIAL PRIMARY KEY,
    product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity     NUMERIC(14,3) NOT NULL DEFAULT 0,
    updated_at   TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (product_id, warehouse_id)
);

CREATE INDEX idx_stock_items_warehouse ON stock_items(warehouse_id);

CREATE TABLE stock_movements (
    id             BIGSERIAL PRIMARY KEY,
    product_id     BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    warehouse_id   BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    movement_type  VARCHAR(20) NOT NULL,   -- PURCHASE_IN, SALE_OUT, ADJUSTMENT_IN, ADJUSTMENT_OUT, TRANSFER_IN, TRANSFER_OUT
    quantity       NUMERIC(14,3) NOT NULL,
    balance_after  NUMERIC(14,3) NOT NULL,
    reference_type VARCHAR(40),            -- PURCHASE_INVOICE, SALES_INVOICE, MANUAL, TRANSFER
    reference_id   BIGINT,
    note           VARCHAR(255),
    created_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- ---------- الموردون والعملاء (Suppliers & Customers) ----------
CREATE TABLE suppliers (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    phone      VARCHAR(40),
    email      VARCHAR(150),
    address    VARCHAR(255),
    tax_number VARCHAR(60),
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE customers (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    phone      VARCHAR(40),
    email      VARCHAR(150),
    address    VARCHAR(255),
    tax_number VARCHAR(60),
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------- فواتير الشراء (Purchase Invoices) ----------
CREATE TABLE purchase_invoices (
    id             BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    supplier_id    BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
    warehouse_id   BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    branch_id      BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    status         VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- DRAFT, CONFIRMED, CANCELLED
    subtotal       NUMERIC(14,3) NOT NULL DEFAULT 0,
    tax_total      NUMERIC(14,3) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14,3) NOT NULL DEFAULT 0,
    grand_total    NUMERIC(14,3) NOT NULL DEFAULT 0,
    paid_amount    NUMERIC(14,3) NOT NULL DEFAULT 0,
    notes          VARCHAR(500),
    created_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE purchase_invoice_items (
    id                  BIGSERIAL PRIMARY KEY,
    purchase_invoice_id BIGINT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    product_id          BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity            NUMERIC(14,3) NOT NULL,
    unit_price          NUMERIC(14,3) NOT NULL,
    tax_rate            NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount            NUMERIC(14,3) NOT NULL DEFAULT 0,
    line_total          NUMERIC(14,3) NOT NULL
);

-- ---------- فواتير المبيعات (Sales Invoices) ----------
CREATE TABLE sales_invoices (
    id             BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    customer_id    BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    warehouse_id   BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    branch_id      BIGINT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    status         VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED', -- DRAFT, CONFIRMED, CANCELLED, RETURNED
    subtotal       NUMERIC(14,3) NOT NULL DEFAULT 0,
    tax_total      NUMERIC(14,3) NOT NULL DEFAULT 0,
    discount_total NUMERIC(14,3) NOT NULL DEFAULT 0,
    grand_total    NUMERIC(14,3) NOT NULL DEFAULT 0,
    paid_amount    NUMERIC(14,3) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',  -- CASH, CARD, TRANSFER, CREDIT
    notes          VARCHAR(500),
    created_by     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE sales_invoice_items (
    id               BIGSERIAL PRIMARY KEY,
    sales_invoice_id BIGINT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id       BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity         NUMERIC(14,3) NOT NULL,
    unit_price       NUMERIC(14,3) NOT NULL,
    tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
    discount         NUMERIC(14,3) NOT NULL DEFAULT 0,
    line_total       NUMERIC(14,3) NOT NULL
);

CREATE INDEX idx_purchase_invoice_items_invoice ON purchase_invoice_items(purchase_invoice_id);
CREATE INDEX idx_sales_invoice_items_invoice ON sales_invoice_items(sales_invoice_id);
CREATE INDEX idx_sales_invoices_created_at ON sales_invoices(created_at);
CREATE INDEX idx_purchase_invoices_created_at ON purchase_invoices(created_at);

-- ---------- التنبيهات (Notifications - e.g. low stock alerts) ----------
CREATE TABLE notifications (
    id                  BIGSERIAL PRIMARY KEY,
    type                VARCHAR(30) NOT NULL,   -- LOW_STOCK, SYSTEM, INFO
    title               VARCHAR(200) NOT NULL,
    message             VARCHAR(500) NOT NULL,
    related_product_id  BIGINT REFERENCES products(id) ON DELETE CASCADE,
    related_warehouse_id BIGINT REFERENCES warehouses(id) ON DELETE CASCADE,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_product ON notifications(related_product_id, related_warehouse_id);

-- منع تكرار تنبيه نفس المنتج/المخزن خلال نفس اليوم بشكل غير مقصود يُدار من التطبيق
