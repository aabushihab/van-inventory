# نظام إدارة محلات السيراميك والبورسلان — الخلفية (Backend)

باك-إند مبني بـ **Spring Boot 3 (Java 21)** و **PostgreSQL** لإدارة محل/محلات سيراميك، بورسلان، وأدوات صحية:
مستخدمون وصلاحيات (RBAC)، منتجات، فروع ومخازن متعددة، فواتير شراء وبيع مع طباعة PDF (A4 وإيصال حراري 58/80mm)،
حركات مخزون كاملة، وتنبيهات تلقائية عند نقصان المخزون.

## المكوّنات التقنية (Tech Stack)

- Java 21 + Spring Boot 3.3
- Spring Security + JWT (مصادقة عديمة الحالة stateless)
- Spring Data JPA + PostgreSQL
- Flyway لإدارة نسخ قاعدة البيانات (Migrations)
- Thymeleaf + openhtmltopdf لتوليد فواتير PDF بالعربية (RTL) باستخدام خط Noto Naskh Arabic المضمّن في `src/main/resources/fonts`
- جدولة (Scheduled Job) لفحص المخزون كل ساعة وإطلاق تنبيهات + بريد إلكتروني اختياري

## المتطلبات (Prerequisites)

- JDK 21
- Maven 3.9+
- PostgreSQL 14+ (محلي أو عبر Docker)

> **ملاحظة مهمة عن البناء (Build):** هذا المشروع تم تجهيزه في بيئة سحابية بدون وصول مباشر لمستودع Maven
> المركزي (Maven Central)، لذلك لم يتم تشغيل `mvn compile` فعلياً للتحقق من نجاح البناء. تم التحقق يدوياً من
> صحة كل التبعيات (إصداراتها ومساراتها الصحيحة عبر التوثيق الرسمي)، لكن يُنصح بتشغيل:
> ```
> mvn clean install
> ```
> فور فتح المشروع على جهازك (الذي يملك اتصال إنترنت طبيعي) للتأكد من عدم وجود أي خطأ طفيف قبل الاعتماد عليه في الإنتاج.

## إعداد قاعدة البيانات (Database Setup)

### الخيار 1: تستخدم PostgreSQL مثبت لديك محلياً (موصى به حسب إعدادك)

الإعدادات الافتراضية في `src/main/resources/application.yml` مضبوطة على:
- Host: `localhost`, Port: `5432`
- Username: `postgres`
- Password: `postgres` (غيّرها إن كانت كلمة مرورك الفعلية مختلفة عبر متغير البيئة `DB_PASSWORD`)
- اسم قاعدة البيانات: `foreeky_ceramic`

قبل أول تشغيل، أنشئ قاعدة البيانات مرة واحدة فقط (Flyway ينشئ الجداول تلقائياً لكنه لا ينشئ قاعدة البيانات نفسها):

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE foreeky_ceramic;"
```

أو نفّذ الملف الجاهز:
```bash
psql -U postgres -h localhost -p 5432 -f create-database.sql
```

### الخيار 2: عبر Docker Compose

```bash
docker compose up -d
```
سينشئ قاعدة بيانات Postgres باسم `foreeky_ceramic` تلقائياً + واجهة pgAdmin على المنفذ `5050`.

## تشغيل التطبيق (Run)

```bash
mvn spring-boot:run
```

سيعمل الخادم على `http://localhost:8080`. عند أول تشغيل، تُنفَّذ ملفات Flyway في `src/main/resources/db/migration`
تلقائياً لإنشاء الجداول وزرع بيانات أولية:

- **مستخدم مدير النظام الافتراضي:** `admin` / `Admin@123` (غيّرها فوراً من شاشة تسجيل الدخول → تغيير كلمة المرور)
- 4 أدوار جاهزة: مدير النظام (ADMIN)، مدير فرع (BRANCH_MANAGER)، أمين مخزن (WAREHOUSE_KEEPER)، كاشير (CASHIER)
- فرع ومخزن افتراضيان، وحدات قياس (كرتونة، م²، قطعة...)، وتصنيفات سيراميك أساسية

## متغيرات البيئة (Environment Variables)

| المتغير | الوصف | القيمة الافتراضية |
|---|---|---|
| `DB_HOST` / `DB_PORT` / `DB_NAME` | اتصال قاعدة البيانات | `localhost` / `5432` / `foreeky_ceramic` |
| `DB_USER` / `DB_PASSWORD` | مستخدم/كلمة مرور قاعدة البيانات | `postgres` / `postgres` |
| `JWT_SECRET` | مفتاح توقيع JWT (**غيّره في الإنتاج**) | قيمة افتراضية طويلة |
| `JWT_EXPIRATION_MS` | مدة صلاحية Access Token | 24 ساعة |
| `CORS_ALLOWED_ORIGINS` | نطاقات الواجهة الأمامية المسموحة | `http://localhost:5173,http://localhost:3000` |
| `LOW_STOCK_CRON` | جدولة فحص نقصان المخزون | كل ساعة |
| `LOW_STOCK_EMAIL_ENABLED` | تفعيل إرسال بريد تنبيه نقصان المخزون | `false` |
| `MAIL_HOST` / `MAIL_USERNAME` / `MAIL_PASSWORD` | إعدادات SMTP لإرسال التنبيهات بالبريد | - |
| `COMPANY_NAME` / `COMPANY_NAME_EN` / `COMPANY_PHONE` / `COMPANY_ADDRESS` / `COMPANY_TAX_NUMBER` / `COMPANY_CURRENCY` | بيانات المحل التي تظهر على الفواتير | - |

## توثيق الـ API

بعد تشغيل الخادم: `http://localhost:8080/swagger-ui.html`

## الصلاحيات (Permissions) الأساسية

`USER_MANAGE`, `ROLE_MANAGE`, `BRANCH_MANAGE`, `WAREHOUSE_MANAGE`, `CATEGORY_MANAGE`, `PRODUCT_VIEW`,
`PRODUCT_MANAGE`, `STOCK_VIEW`, `STOCK_ADJUST`, `STOCK_TRANSFER`, `SUPPLIER_MANAGE`, `CUSTOMER_MANAGE`,
`PURCHASE_INVOICE_VIEW`, `PURCHASE_INVOICE_CREATE`, `SALES_INVOICE_VIEW`, `SALES_INVOICE_CREATE`,
`SALES_INVOICE_PRINT`, `NOTIFICATION_VIEW`, `REPORTS_VIEW`, `DASHBOARD_VIEW`.

يمكن إنشاء/تعديل أدوار جديدة وتخصيص أي مجموعة صلاحيات لها من شاشة "الأدوار والصلاحيات" في الواجهة.

## طباعة الفواتير (Invoice Printing)

- `GET /api/sales-invoices/{id}/print/a4` → فاتورة A4 (PDF) مناسبة للطباعة العادية أو الإرسال بالبريد.
- `GET /api/sales-invoices/{id}/print/thermal?width=80` → إيصال حراري (58 أو 80mm) كملف PDF (متوافق مع أغلب
  طابعات الإيصالات الحرارية التي تدعم طباعة PDF مباشرة).
- نفس المسارات متوفرة تحت `/api/purchase-invoices/{id}/print/...` لفواتير الشراء.

## تنبيهات نقصان المخزون (Low Stock Alerts)

لكل منتج حقل `minStockThreshold` (حد التنبيه). عند وصول الكمية المتوفرة في أي مخزن لهذا الحد أو أقل:
1. يُنشأ تنبيه داخل النظام فوراً (يظهر في شاشة "التنبيهات" وفي جرس الإشعارات).
2. مهمة مجدولة (كل ساعة افتراضياً، قابلة للتغيير عبر `LOW_STOCK_CRON`) تعيد فحص كل المخازن وترسل بريداً إلكترونياً
   ملخصاً لكل من يملك صلاحية `NOTIFICATION_VIEW` ولديه بريد إلكتروني مسجّل، إذا تم تفعيل `LOW_STOCK_EMAIL_ENABLED`.

## هيكل المشروع (Project Structure)

```
src/main/java/com/ceramicerp/
├── config/        إعدادات الأمان و CORS
├── security/      JWT، UserDetails، الفلاتر
├── model/         كيانات JPA
├── repository/    مستودعات Spring Data
├── service/       منطق الأعمال
├── controller/    REST Controllers
├── dto/           كائنات نقل البيانات
├── pdf/           توليد فواتير PDF
├── scheduler/      مهمة فحص نقصان المخزون
└── exception/     معالجة الأخطاء الموحدة
src/main/resources/
├── db/migration/  ملفات Flyway (المخطط + البيانات الأولية)
├── templates/pdf/ قوالب الفواتير (Thymeleaf)
└── fonts/         خطوط عربية مضمّنة لتوليد PDF
```
