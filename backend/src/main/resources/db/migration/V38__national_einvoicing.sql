-- الربط الاختياري مع نظام الفوترة الوطني الأردني (JoFotara)

-- إعدادات الربط (معطّل افتراضياً - النظام يعمل كالمعتاد بدونه)
ALTER TABLE company_settings
    ADD COLUMN einv_enabled             BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN einv_taxpayer_type       VARCHAR(20)  NOT NULL DEFAULT 'GENERAL_SALES', -- INCOME | GENERAL_SALES
    ADD COLUMN einv_send_mode           VARCHAR(10)  NOT NULL DEFAULT 'AUTO',          -- AUTO | MANUAL
    ADD COLUMN einv_registration_name   VARCHAR(200),
    ADD COLUMN einv_income_source_seq   VARCHAR(50),
    ADD COLUMN einv_client_id           VARCHAR(200),
    ADD COLUMN einv_secret_key          VARCHAR(500),
    ADD COLUMN einv_api_url             VARCHAR(300) NOT NULL DEFAULT 'https://backend.jofotara.gov.jo/core/invoices/';

-- بيانات المشتري المطلوبة للفاتورة الإلكترونية
ALTER TABLE customers
    ADD COLUMN id_type     VARCHAR(5),   -- NIN رقم وطني | PN رقم شخصي لغير الأردني | TN رقم ضريبي
    ADD COLUMN id_number   VARCHAR(30),
    ADD COLUMN postal_code VARCHAR(20),
    ADD COLUMN city_code   VARCHAR(10);  -- JO-AM, JO-AZ, JO-IR ...

-- نوع الصنف عندما تكون نسبة ضريبته صفر: Z معفى | O خاضع لنسبة الصفر
ALTER TABLE products
    ADD COLUMN zero_tax_type VARCHAR(1) NOT NULL DEFAULT 'Z';

-- عدّاد الفواتير الإلكترونية (ICV): تسلسل متصاعد لكل مستند يُرسَل
CREATE SEQUENCE einvoice_icv_seq START 1;

-- مستندات الفوترة: فاتورة جديدة أو فاتورة إرجاع (جزئي أو كامل عند الإلغاء)
CREATE TABLE einvoice_submissions (
    id                BIGSERIAL PRIMARY KEY,
    doc_type          VARCHAR(20)  NOT NULL,             -- INVOICE | RETURN | CANCEL_RETURN
    sales_invoice_id  BIGINT       NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    sales_return_id   BIGINT       REFERENCES sales_returns(id) ON DELETE CASCADE,
    doc_number        VARCHAR(60)  NOT NULL,
    uuid              VARCHAR(36)  NOT NULL UNIQUE,
    icv               BIGINT       NOT NULL,
    cash              BOOLEAN      NOT NULL DEFAULT TRUE,             -- نقدي (true) أو ذمم (false) وقت إصدار الفاتورة
    status            VARCHAR(15)  NOT NULL DEFAULT 'PENDING', -- PENDING | SENT | FAILED | CANCELLED
    retryable         BOOLEAN      NOT NULL DEFAULT TRUE,
    attempts          INT          NOT NULL DEFAULT 0,
    last_error        TEXT,
    qr_code           TEXT,
    response          TEXT,
    xml               TEXT,
    reason            VARCHAR(300),
    last_attempt_at   TIMESTAMP,
    sent_at           TIMESTAMP,
    created_at        TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX idx_einv_invoice ON einvoice_submissions(sales_invoice_id);
CREATE INDEX idx_einv_status ON einvoice_submissions(status);
