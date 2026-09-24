-- إعدادات الشركة القابلة للتعديل من الواجهة (اسم الشركة، الرقم الضريبي...) بدلاً من الاعتماد فقط على متغيرات البيئة.
-- Editable company settings (name, tax number...) instead of relying only on environment variables.
-- سجل واحد فقط يُنشأ تلقائياً عند أول استخدام، مبدئياً من القيم الحالية في application.yml/متغيرات البيئة.
CREATE TABLE company_settings (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    name_en     VARCHAR(200),
    tax_number  VARCHAR(100),
    phone       VARCHAR(60),
    address     VARCHAR(255),
    currency    VARCHAR(10) NOT NULL DEFAULT 'JOD',
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
