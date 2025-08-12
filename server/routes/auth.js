const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// Error handling middleware for auth routes
router.use((err, req, res, next) => {
  console.error('Auth route error:', err);
  res.status(500).json({ 
    message: 'خطأ في المصادقة', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { name, password, phoneNumber, type, parentPhoneNumber, center, grade } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'phoneNumber already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      password: hashedPassword,
      phoneNumber,
      type,
      email: phoneNumber+"@alzuhary.com",
      parentPhoneNumber: type === 'Student' ? parentPhoneNumber : undefined,
      center,
      grade,
      active: type === 'Student' ? true : false // تفعيل تلقائي للطلاب
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Signin
router.post('/signin', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    
    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !password) {
      return res.status(400).json({ message: 'يرجى إدخال رقم الهاتف وكلمة المرور' });
    }
    
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'بيانات غير صحيحة' });
    }
    
    // إلغاء التحقق من التفعيل للطلاب - يمكنهم تسجيل الدخول مباشرة
    // if (!user.active) {
    //   return res.status(403).json({ message: 'الحساب غير مفعل، يرجى التواصل مع الإدارة' });
    // }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, type: user.type },
      process.env.JWT_SECRET,
      { expiresIn: '365d' } // زيادة مدة الصلاحية إلى سنة كاملة
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        phoneNumber: user.phoneNumber, 
        type: user.type, 
        grade: user.grade 
      } 
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'خطأ في الخادم', error: err.message });
  }
});

// طلب إعادة تعيين كلمة السر
router.post('/request-password-reset', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: 'يرجى إدخال رقم الهاتف' });
    const user = await User.findOne({ phoneNumber });
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    if (user.resetRequested) {
      return res.status(400).json({ message: 'تم ارسال طلبك من قبل برجاء انتظار معالجة طلبك' });
    }
    // تحقق من وجود بيانات أساسية
    if (!user.name || !user.phoneNumber) {
      return res.status(400).json({ message: 'بيانات المستخدم غير مكتملة، يرجى التواصل مع الدعم' });
    }
    user.resetRequested = true;
    await user.save();
    // إنشاء إشعار
    await Notification.create({
      type: 'password_reset_request',
      userId: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      forAdminOnly: true
    });
    res.json({ name: user.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// JWT Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token is not valid' });
    req.user = user;
    next();
  });
}

// جلب بيانات المستخدم الحالي
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // تحويل البيانات القديمة إلى الشكل الجديد
    const purchasedLessons = (user.purchasedLessons || []).map(lesson => {
      if (typeof lesson === 'object' && lesson.lessonId) {
        return {
          lessonId: lesson.lessonId,
          video: lesson.video !== undefined ? lesson.video : true,
          assignment: lesson.assignment !== undefined ? lesson.assignment : true
        };
      } else {
        return { lessonId: lesson, video: true, assignment: true };
      }
    });

    res.json({
      id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      type: user.type,
      credits: user.credits,
      active: user.active,
      purchasedCourses: user.purchasedCourses || [],
      purchasedLessons: purchasedLessons,
      watchedLessons: user.watchedLessons || [],
      examScores: user.examScores || [],
      lessonViewCounts: user.lessonViewCounts || []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب إشعارات الأدمن فقط
router.get('/notifications/admin', authenticateToken, async (req, res) => {
  try {
    // تحقق أن المستخدم أدمن
    const user = await User.findById(req.user.userId);
    if (!user || user.type !== 'Admin') return res.status(403).json({ message: 'غير مصرح' });
    const notifications = await Notification.find({ forAdminOnly: true }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تعليم إشعار كمقروء
router.put('/notifications/:id/seen', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.type !== 'Admin') return res.status(403).json({ message: 'غير مصرح' });
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'الإشعار غير موجود' });
    notification.seen = true;
    await notification.save();
    res.json({ message: 'تم تعليم الإشعار كمقروء', notification });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// حذف كل الإشعارات المقروءة
router.delete('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.type !== 'Admin') return res.status(403).json({ message: 'غير مصرح' });
    const result = await Notification.deleteMany({ forAdminOnly: true, seen: true });
    res.json({ message: 'تم حذف كل الإشعارات المقروءة', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = { router, authenticateToken };