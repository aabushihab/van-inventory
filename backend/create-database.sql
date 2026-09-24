-- شغّل هذا الأمر مرة واحدة فقط باستخدام مستخدم postgres لإنشاء قاعدة البيانات قبل تشغيل التطبيق
-- Run this once with the postgres superuser to create the database before starting the app.
--
-- مثال (Windows / psql):
--   psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE foreeky_ceramic;"
--
-- أو من داخل psql:
--   \c postgres
--   CREATE DATABASE foreeky_ceramic;

CREATE DATABASE foreeky_ceramic;
