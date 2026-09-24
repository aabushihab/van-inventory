-- دفعات متعددة على فاتورة واحدة (تقسيط): كل دفعة سجل مستقل، ورصيد الفاتورة paid_amount هو مجموع الدفعات (محفوظ للأداء).
-- Multiple payments per invoice (installments): each payment is its own record; the invoice's paid_amount stays a
-- cached running total of its payments for fast reads.

CREATE TABLE sales_invoice_payments (
    id                BIGSERIAL PRIMARY KEY,
    sales_invoice_id  BIGINT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    amount            NUMERIC(14,3) NOT NULL,
    payment_method    VARCHAR(20) NOT NULL DEFAULT 'CASH',
    note              VARCHAR(255),
    created_by        BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE purchase_invoice_payments (
    id                   BIGSERIAL PRIMARY KEY,
    purchase_invoice_id  BIGINT NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    amount               NUMERIC(14,3) NOT NULL,
    note                 VARCHAR(255),
    created_by           BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_invoice_payments_invoice ON sales_invoice_payments(sales_invoice_id);
CREATE INDEX idx_purchase_invoice_payments_invoice ON purchase_invoice_payments(purchase_invoice_id);

-- تهيئة السجل التاريخي: أي فاتورة سابقة فيها مبلغ مدفوع تُسجَّل كدفعة أولى حتى يبقى مجموع الدفعات متسقاً مع paid_amount.
INSERT INTO sales_invoice_payments (sales_invoice_id, amount, payment_method, created_at)
SELECT id, paid_amount, payment_method, created_at FROM sales_invoices WHERE paid_amount > 0;

INSERT INTO purchase_invoice_payments (purchase_invoice_id, amount, created_at)
SELECT id, paid_amount, created_at FROM purchase_invoices WHERE paid_amount > 0;
