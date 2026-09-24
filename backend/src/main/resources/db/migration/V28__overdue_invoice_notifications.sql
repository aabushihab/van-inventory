ALTER TABLE notifications
    ADD COLUMN related_sales_invoice_id BIGINT REFERENCES sales_invoices(id) ON DELETE CASCADE,
    ADD COLUMN related_purchase_invoice_id BIGINT REFERENCES purchase_invoices(id) ON DELETE CASCADE;

CREATE INDEX idx_notifications_sales_invoice ON notifications(related_sales_invoice_id);
CREATE INDEX idx_notifications_purchase_invoice ON notifications(related_purchase_invoice_id);
