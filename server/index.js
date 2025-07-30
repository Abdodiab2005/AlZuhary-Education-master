require('dotenv').config();
// تعيين بيئة التطوير إذا لم تكن محددة
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// إعدادات CORS موحدة
app.use(cors({
  origin: true, // السماح لجميع الأصول مؤقتاً لحل المشكلة
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Origin', 'Accept'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// إضافة middleware للتأكد من CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Handle preflight requests
app.options('*', cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Auth routes
const { router: authRoutes } = require('./routes/auth');
app.use('/api/auth', authRoutes);

const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

const coursesRoutes = require('./routes/courses');
app.use('/api/courses', coursesRoutes);
// تسجيل راوت lecture مباشرة على /api/lecture
app.use('/api/lecture', coursesRoutes);

const rechargeRoutes = require('./routes/recharge');
app.use('/api/recharge', rechargeRoutes);

const homeworkRoutes = require('./routes/homework');
app.use('/api/homework', homeworkRoutes);

const filesRoutes = require('./routes/files');
app.use('/api/files', filesRoutes);

const examsRoutes = require('./routes/exams');
app.use('/api/exams', examsRoutes);

// التحقق من حالة الخادم
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: req.headers.origin,
      allowed: true
    }
  });
});

// نقطة نهاية لاختبار CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    cors: {
      allowOrigin: res.getHeader('Access-Control-Allow-Origin'),
      allowMethods: res.getHeader('Access-Control-Allow-Methods'),
      allowHeaders: res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// نقطة نهاية لاختبار OPTIONS
app.options('/api/cors-test', (req, res) => {
  res.sendStatus(200);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request Method:', req.method);
  console.error('Request Headers:', req.headers);
  console.error('Origin:', req.headers.origin);
  
  // معالجة أخطاء CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'خطأ في CORS',
      message: 'المصدر غير مسموح به',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({ 
    error: 'حدث خطأ في الخادم',
    message: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي في الخادم',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 for non-API routes
app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.status(404).json({ 
      error: 'المسار غير موجود',
      message: `المسار ${req.path} غير موجود`,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and host 0.0.0.0`);
}); 