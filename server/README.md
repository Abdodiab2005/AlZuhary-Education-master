# AlZuhary Education Server

## 📋 المتطلبات

- Node.js (v14 أو أحدث)
- MongoDB
- npm أو yarn

## 🚀 التثبيت والتشغيل

### 1. تثبيت المتطلبات
```bash
npm install
```

### 2. إعداد متغيرات البيئة
أنشئ ملف `.env` في مجلد الخادم وأضف:

```env
# MongoDB Connection
MONGO_URI=mongodb://your-mongodb-connection-string

# JWT Secret Key
JWT_SECRET=your-super-secure-jwt-secret-key

# Server Port
PORT=3000

# Environment
NODE_ENV=production

# Bcrypt rounds
BCRYPT_ROUNDS=12
```

### 3. تشغيل الخادم

**للإنتاج:**
```bash
npm start
```

**للتطوير:**
```bash
npm run dev
```

## 🔗 API Endpoints

### المصادقة
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/logout` - تسجيل الخروج

### المستخدمين
- `GET /api/users` - جلب جميع المستخدمين
- `GET /api/users/:id` - جلب مستخدم محدد
- `PUT /api/users/:id` - تحديث مستخدم
- `DELETE /api/users/:id` - حذف مستخدم

### الدورات
- `GET /api/courses` - جلب جميع الدورات
- `POST /api/courses` - إنشاء دورة جديدة
- `PUT /api/courses/:id` - تحديث دورة
- `DELETE /api/courses/:id` - حذف دورة

### المحاضرات
- `GET /api/lecture` - جلب المحاضرات
- `POST /api/lecture` - إنشاء محاضرة جديدة

### الاختبارات
- `GET /api/exams` - جلب الاختبارات
- `POST /api/exams` - إنشاء اختبار جديد

### الملفات
- `GET /api/files` - جلب الملفات
- `POST /api/files` - رفع ملف جديد

### الواجبات
- `GET /api/homework` - جلب الواجبات
- `POST /api/homework` - إنشاء واجب جديد

### إعادة الشحن
- `GET /api/recharge` - جلب أكواد الشحن
- `POST /api/recharge` - إنشاء كود شحن جديد

### فحص حالة الخادم
- `GET /api/health` - فحص حالة الخادم

## 📁 هيكل المشروع

```
server/
├── index.js          # نقطة البداية للخادم
├── package.json      # تبعيات المشروع
├── .env              # متغيرات البيئة (لا يتم رفعه)
├── routes/           # مسارات API
│   ├── auth.js       # مسارات المصادقة
│   ├── users.js      # مسارات المستخدمين
│   ├── courses.js    # مسارات الدورات
│   ├── exams.js      # مسارات الاختبارات
│   ├── files.js      # مسارات الملفات
│   ├── homework.js   # مسارات الواجبات
│   └── recharge.js   # مسارات إعادة الشحن
├── models/           # نماذج قاعدة البيانات
│   ├── User.js       # نموذج المستخدم
│   ├── Course.js     # نموذج الدورة
│   ├── Exam.js       # نموذج الاختبار
│   └── ...
└── uploads/          # الملفات المرفوعة
```

## 🔒 الأمان

- يتم تشفير كلمات المرور باستخدام bcrypt
- يتم استخدام JWT للمصادقة
- CORS محدد للدومينات المسموح بها
- معالجة الأخطاء محسنة

## 📝 ملاحظات

- تأكد من إعداد MongoDB بشكل صحيح
- لا تشارك JWT_SECRET مع أي شخص
- تأكد من أن مجلد uploads موجود وقابل للكتابة
- للاستضافة، تأكد من إعداد NODE_ENV=production 