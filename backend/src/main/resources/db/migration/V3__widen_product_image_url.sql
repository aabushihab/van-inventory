-- يخزّن هذا العمود الآن صورة المنتج كـ base64 data URI بدلاً من رابط خارجي فقط، لذا يحتاج نوعاً بلا حد طول.
ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;
