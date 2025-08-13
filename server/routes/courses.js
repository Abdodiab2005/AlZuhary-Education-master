const express = require('express');
const Course = require('../models/Course');
const Exam = require('../models/Exam');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { authenticateToken } = require('./auth');
const mongoose = require('mongoose'); // تأكد من وجود هذا السطر في أعلى الملف

const router = express.Router();

// Error handling middleware for courses routes
router.use((err, req, res, next) => {
  console.error('Courses route error:', err);
  res.status(500).json({ 
    message: 'خطأ في الدورات', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// دالة لتحويل روابط YouTube إلى صيغة embed
function convertToEmbedUrl(videoUrl) {
  if (!videoUrl) return videoUrl;
  
  // إذا كان الرابط بالفعل بصيغة embed، ارجعه كما هو
  if (videoUrl.includes('youtube.com/embed/')) {
    return videoUrl;
  }
  
  // تحويل youtube.com/watch?v=... إلى embed
  let match = videoUrl.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/)([\w-]+)/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  
  // إذا لم يكن رابط YouTube، ارجعه كما هو
  return videoUrl;
}

// إعداد التخزين للصور
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// جلب جميع الكورسات مع فلترة حسب السنة الدراسية للطالب
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let courses;
    
    // إذا كان المستخدم طالب، اعرض الكورسات المناسبة لسنه الدراسية
    if (user && user.type === 'Student' && user.grade) {
      // ابحث عن الكورسات المحددة للسنة الدراسية + الكورسات التي لا تحتوي على grade
      courses = await Course.find({
        $or: [
          { grade: user.grade },
          { grade: { $exists: false } },
          { grade: null },
          { grade: "" }
        ]
      });
    } else {
      // للمدرسين والأدمن، اعرض كل الكورسات
      courses = await Course.find();
    }
    
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب جميع الكورسات بدون فلترة (للتوافق مع الكود القديم)
router.get('/public', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب جميع الكورسات مع تفاصيلها (للأدمن)
router.get('/debug', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json({
      count: courses.length,
      courses: courses.map(c => ({
        id: c._id,
        name: c.name,
        grade: c.grade || 'غير محدد',
        description: c.description
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// التحقق من حالة الخادم
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// جلب جميع الكورسات (للأدمن والمدرسين)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user.type !== 'Admin' && user.type !== 'Teacher') {
      return res.status(403).json({ message: 'غير مصرح' });
    }
    const courses = await Course.find();
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// إضافة كورس جديد مع دعم رفع صورة
router.post('/', upload.single('image'), async (req, res) => {
  try {
    let courseData = req.body;
    if (req.file) {
      courseData.image = `/uploads/${req.file.filename}`;
    }
    // دعم وصف الكورس
    if (!courseData.description) courseData.description = "";
    const course = new Course(courseData);
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// شراء كورس
router.post('/:id/buy', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const course = await Course.findById(req.params.id);
    if (!user || !course) return res.status(404).json({ message: 'المستخدم أو الكورس غير موجود' });
    // تحويل القديم إلى كائنات
    user.purchasedLessons = (user.purchasedLessons || []).map(l => (typeof l === 'object' && l.lessonId) ? l : { lessonId: l, video: true, assignment: true });
    if (user.purchasedCourses.includes(course._id)) {
      return res.status(400).json({ message: 'تم شراء الكورس بالفعل' });
    }
    if (user.credits < course.price) {
      return res.status(400).json({ message: 'الرصيد غير كافي' });
    }
    user.credits -= course.price;
    user.purchasedCourses.push(course._id);
    if (!user.purchasedLessons) user.purchasedLessons = [];
    // أضف كل الدروس ككائنات
    course.lessons.forEach(lesson => {
      if (!user.purchasedLessons.some(l => l.lessonId && l.lessonId.toString() === lesson._id.toString())) {
        user.purchasedLessons.push({ lessonId: lesson._id, video: true, assignment: true });
      }
    });
    user.active = true;
    await user.save();
    res.json({ message: 'تم شراء الكورس بنجاح', credits: user.credits });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

// تعديل بيانات كورس مع دعم رفع صورة جديدة
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    let updateData = {
      name: req.body.name,
      price: req.body.price
    };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    // دعم تعديل وصف الكورس
    if (req.body.description !== undefined) {
      updateData.description = req.body.description;
    }
    // إذا لم يتم رفع صورة جديدة، لا تحدث الصورة
    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب دروس كورس محدد
router.get('/:id/lessons', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    res.json(course.lessons || []);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// إضافة درس جديد لكورس محدد
router.post('/:id/lessons', upload.single('image'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    
    let lessonData = {
      title: req.body.title,
      price: req.body.price,
      videoUrl: convertToEmbedUrl(req.body.videoUrl),
      assignmentUrl: convertToEmbedUrl(req.body.assignmentUrl),
      viewLimit: parseInt(req.body.viewLimit) || 5,
      viewPrice: parseInt(req.body.viewPrice) || 10
    };
    
    if (req.file) {
      lessonData.image = `/uploads/${req.file.filename}`;
    }
    
    course.lessons.push(lessonData);
    await course.save();
    
    res.status(201).json(course.lessons[course.lessons.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// شراء درس محدد
router.post('/:courseId/lessons/:lessonId/buy', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const course = await Course.findById(req.params.courseId);
    
    if (!user || !course) {
      return res.status(404).json({ message: 'المستخدم أو الكورس غير موجود' });
    }
    
    const lesson = course.lessons.id(req.params.lessonId);
    
    if (!lesson) {
      return res.status(404).json({ message: 'الدرس غير موجود' });
    }
    
    // تحويل القديم إلى كائنات وتحقق من الشراء
    user.purchasedLessons = (user.purchasedLessons || []).map(l => {
      if (typeof l === 'object' && l.lessonId) {
        return {
          lessonId: l.lessonId,
          video: l.video !== undefined ? l.video : true,
          assignment: l.assignment !== undefined ? l.assignment : true
        };
      } else {
        return { lessonId: l, video: true, assignment: true };
      }
    });
    
    // التحقق من أن الدرس مشترى بالفعل
    const alreadyPurchased = user.purchasedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lesson._id.toString()
    );
    
    if (alreadyPurchased) {
      return res.status(400).json({ message: 'تم شراء الدرس بالفعل' });
    }
    
    // التحقق من شراء الكورس بالكامل
    const coursePurchased = user.purchasedCourses.includes(course._id);
    
    if (coursePurchased) {
      // إضافة الدرس الجديد مع تفعيل كامل (فيديو وواجب)
      user.purchasedLessons.push({ 
        lessonId: lesson._id, 
        video: true, 
        assignment: true 
      });
      await user.save();
      return res.json({ 
        message: 'الدرس متاح لك (الكورس مشترى)', 
        credits: user.credits,
        lessonId: lesson._id 
      });
    }
    
    if (user.credits < lesson.price) {
      return res.status(400).json({ message: 'الرصيد غير كافي' });
    }
    
    user.credits -= lesson.price;
    if (!user.purchasedLessons) user.purchasedLessons = [];
    user.purchasedLessons.push({ lessonId: lesson._id, video: true, assignment: true });
    user.active = true;
    
    await user.save();
    
    res.json({ 
      message: 'تم شراء الدرس بنجاح', 
      credits: user.credits,
      lessonId: lesson._id 
    });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

// جلب كورس محدد
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تحديث سنة دراسية لكورس محدد
router.patch('/:id/grade', async (req, res) => {
  try {
    const { grade } = req.body;
    if (!grade || !['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'].includes(grade)) {
      return res.status(400).json({ message: 'السنة الدراسية غير صحيحة' });
    }
    
    const course = await Course.findByIdAndUpdate(
      req.params.id, 
      { grade }, 
      { new: true }
    );
    
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تحديث كل الكورسات التي لا تحتوي على grade
router.patch('/update-all-grades', async (req, res) => {
  try {
    const { grade } = req.body;
    if (!grade || !['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'].includes(grade)) {
      return res.status(400).json({ message: 'السنة الدراسية غير صحيحة' });
    }
    
    const result = await Course.updateMany(
      { 
        $or: [
          { grade: { $exists: false } },
          { grade: null },
          { grade: "" }
        ]
      },
      { grade }
    );
    
    res.json({ 
      message: `تم تحديث ${result.modifiedCount} كورس`,
      modifiedCount: result.modifiedCount 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب درس منفرد من كورس
router.get('/:courseId/lessons/:lessonId', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ message: 'غير مصرح' });
    if (user.type === 'Admin' || user.type === 'Teacher') {
      return res.json(lesson);
    }
    // طالب: يجب أن يكون الدرس مملوكًا له
    if (
      user.purchasedLessons &&
      user.purchasedLessons.some(l => (l.lessonId && l.lessonId.toString() === lesson._id.toString()))
    ) {
      return res.json(lesson);
    }
    return res.status(403).json({ message: 'غير مصرح لك بمشاهدة هذا الدرس' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تعديل درس محدد
router.put('/:courseId/lessons/:lessonId', upload.single('image'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    
    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });
    
    // تحديث بيانات الدرس
    lesson.title = req.body.title || lesson.title;
    lesson.price = req.body.price || lesson.price;
    lesson.videoUrl = req.body.videoUrl ? convertToEmbedUrl(req.body.videoUrl) : lesson.videoUrl;
    lesson.assignmentUrl = req.body.assignmentUrl ? convertToEmbedUrl(req.body.assignmentUrl) : lesson.assignmentUrl;
    lesson.viewLimit = req.body.viewLimit ? parseInt(req.body.viewLimit) : lesson.viewLimit;
    lesson.viewPrice = req.body.viewPrice ? parseInt(req.body.viewPrice) : lesson.viewPrice;
    
    if (req.file) {
      lesson.image = `/uploads/${req.file.filename}`;
    }
    
    await course.save();
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// حذف درس محدد
router.delete('/:courseId/lessons/:lessonId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    
    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });
    
    course.lessons.pull(req.params.lessonId);
    await course.save();
    
    res.json({ message: 'تم حذف الدرس بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// حذف كورس محدد
router.delete('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    
    res.json({ message: 'تم حذف الكورس بنجاح' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب درس منفرد بالـ lessonId فقط (بدون تحقق من التوكن للتجربة)
router.get('/lessons/:lessonId', async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const lessonObjectId = mongoose.Types.ObjectId.isValid(lessonId) ? mongoose.Types.ObjectId(lessonId) : null;

    // ابحث عن الكورس الذي يحتوي على الدرس
    const course = await Course.findOne({
      $or: [
        { "lessons._id": lessonId },
        ...(lessonObjectId ? [{ "lessons._id": lessonObjectId }] : [])
      ]
    });
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    // ابحث عن الدرس داخل الكورس
    const lesson = course.lessons.id(lessonId) || (lessonObjectId && course.lessons.id(lessonObjectId));
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });

    // (تم حذف التحقق من صلاحية المستخدم والتوكن للتجربة)
    return res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// راوت جديد لجلب الدرس مباشرة بالـ id من جميع الكورسات (حل جذري)
router.get('/lessons/raw/:lessonId', async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const courses = await Course.find();
    let foundLesson = null;
    for (const course of courses) {
      const lesson = course.lessons.id(lessonId);
      if (lesson) {
        foundLesson = lesson;
        break;
      }
    }
    if (!foundLesson) return res.status(404).json({ message: 'الدرس غير موجود' });
    res.json(foundLesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب بيانات محاضرة (درس) بالـ id مباشرة
router.get('/:lessonId', async (req, res) => {
  try {
    const lessonId = req.params.lessonId;
    const lessonObjectId = mongoose.Types.ObjectId.isValid(lessonId) ? mongoose.Types.ObjectId(lessonId) : null;

    // ابحث عن الكورس الذي يحتوي على الدرس
    const course = await Course.findOne({
      $or: [
        { "lessons._id": lessonId },
        ...(lessonObjectId ? [{ "lessons._id": lessonObjectId }] : [])
      ]
    });
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    // ابحث عن الدرس داخل الكورس
    const lesson = course.lessons.id(lessonId) || (lessonObjectId && course.lessons.id(lessonObjectId));
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });

    return res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تسجيل مشاهدة الطالب للدرس
router.post('/:courseId/lessons/:lessonId/watch', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ message: 'غير مصرح' });
    
    // جلب الدرس للتحقق من الحد الأقصى
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });
    
    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });
    
    // التحقق من عدد مرات المشاهدة
    let viewCount = user.lessonViewCounts.find(v => v.lessonId.toString() === req.params.lessonId);
    if (!viewCount) {
      viewCount = { lessonId: req.params.lessonId, viewCount: 0 };
      user.lessonViewCounts.push(viewCount);
    }
    
    // التحقق من الحد الأقصى
    if (viewCount.viewCount >= lesson.viewLimit) {
      return res.status(403).json({ 
        message: 'لقد وصلت للحد الأقصى من مرات المشاهدة لهذا الدرس',
        viewLimit: lesson.viewLimit,
        currentViews: viewCount.viewCount
      });
    }
    
    // زيادة عدد مرات المشاهدة
    viewCount.viewCount++;
    
    // إضافة إلى watchedLessons إذا لم تكن موجودة
    const already = user.watchedLessons.find(l => l.lessonId.toString() === req.params.lessonId);
    if (!already) {
      user.watchedLessons.push({ lessonId: req.params.lessonId });
    }
    
    await user.save();
    res.json({
      watched: true,
      viewCount: viewCount.viewCount,
      viewLimit: lesson.viewLimit,
      remainingViews: lesson.viewLimit - viewCount.viewCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// شراء مرات مشاهدة إضافية
router.post('/:courseId/lessons/:lessonId/buy-views', authenticateToken, async (req, res) => {
  try {
    const { numberOfViews } = req.body;
    
    if (!numberOfViews || numberOfViews <= 0) {
      return res.status(400).json({ message: 'يجب تحديد عدد مرات المشاهدة المطلوبة' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ message: 'غير مصرح' });

    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    const lesson = course.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });

    // التحقق من أن المستخدم اشترى الدرس أو الكورس
    const courseUnlocked = user.purchasedCourses.includes(course._id);
    const lessonActivation = user.purchasedLessons.find(l => l.lessonId.toString() === req.params.lessonId);
    
    // تحديد موقع الدرس في الكورس
    const currentLessonIndex = course.lessons.findIndex(l => l._id.toString() === req.params.lessonId);
    
    // الدرس الأول متاح دائماً، أو إذا كان الكورس مشترى أو الدرس مشترى
    if (currentLessonIndex === 0 || courseUnlocked || lessonActivation) {
      // يمكن شراء مرات المشاهدة
    } else {
      return res.status(403).json({ message: 'يجب شراء الدرس أولاً' });
    }

    const totalPrice = lesson.viewPrice * numberOfViews;
    
    if (user.credits < totalPrice) {
      return res.status(400).json({ 
        message: 'رصيد غير كافي',
        required: totalPrice,
        current: user.credits
      });
    }

    // خصم المبلغ من رصيد المستخدم
    user.credits -= totalPrice;

    // إضافة مرات المشاهدة الإضافية
    let viewCount = user.lessonViewCounts.find(v => v.lessonId.toString() === req.params.lessonId);
    if (!viewCount) {
      viewCount = { lessonId: req.params.lessonId, viewCount: 0 };
      user.lessonViewCounts.push(viewCount);
    }
    
    // إضافة مرات المشاهدة الإضافية (نضيف إلى الليمت الأصلي)
    viewCount.viewCount = Math.max(0, viewCount.viewCount - numberOfViews);

    await user.save();

    res.json({
      success: true,
      message: `تم شراء ${numberOfViews} مرات مشاهدة بنجاح`,
      newBalance: user.credits,
      remainingViews: lesson.viewLimit - viewCount.viewCount,
      totalPaid: totalPrice
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// التحقق من إمكانية الوصول للدرس بناءً على تفعيل الدرس
router.get('/:courseId/lessons/:lessonId/access-check', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ message: 'غير مصرح' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    const lessons = course.lessons;
    const currentLessonIndex = lessons.findIndex(l => l._id.toString() === lessonId);
    
    // إذا كان الدرس الأول، يمكن الوصول إليه دائماً
    if (currentLessonIndex === 0) {
      return res.json({ 
        canAccess: true, 
        reason: 'First lesson',
        isFirstLesson: true 
      });
    }

    // التحقق من تفعيل الدرس الحالي
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const lessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    // يمكن الوصول للدرس إذا كان الكورس مفعل أو تم تفعيل الدرس
    if (courseUnlocked || lessonActivation) {
      return res.json({ 
        canAccess: true, 
        reason: 'Lesson activated'
      });
    }

    // إذا لم يكن مفعل، لا يمكن الوصول
    return res.json({ 
      canAccess: false, 
      reason: 'Lesson not activated'
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب حالة الدرس الكاملة (الوصول، الامتحانات، المشاهدة)
router.get('/:courseId/lessons/:lessonId/status', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(403).json({ message: 'غير مصرح' });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    const lessons = course.lessons;
    const currentLessonIndex = lessons.findIndex(l => l._id.toString() === lessonId);
    const lesson = course.lessons.id(lessonId);
    
    // التحقق من إمكانية الوصول للدرس
    let canAccessLesson = true;
    let previousLessonId = null;
    
    // التحقق من تفعيل الدرس الحالي
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const lessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    // يمكن الوصول للدرس إذا كان الكورس مفعل أو تم تفعيل الدرس
    canAccessLesson = courseUnlocked || !!lessonActivation;

    if (currentLessonIndex > 0) {
      previousLessonId = lessons[currentLessonIndex - 1]._id;
    }

    // التحقق من إمكانية أخذ امتحان الدرس الحالي
    const canTakeCurrentExam = (courseUnlocked || (lessonActivation && (lessonActivation.video || lessonActivation.assignment))) && 
      user.watchedLessons.some(l => l.lessonId && l.lessonId.toString() === lessonId);

    // التحقق من إمكانية أخذ امتحان الدرس السابق
    let canTakePreviousExam = false;
    if (currentLessonIndex > 0 && previousLessonId) {
      // التحقق من تفعيل الدرس السابق
      const previousLessonActivation = user.purchasedLessons.find(l => 
        l.lessonId && l.lessonId.toString() === previousLessonId.toString()
      );
      
      // إذا كان الكورس مفعل أو تم تفعيل الدرس السابق
      if (courseUnlocked || previousLessonActivation) {
        // التحقق من وجود امتحان للدرس السابق
        const Exam = require('../models/Exam');
        const exam = await Exam.findOne({ lessonId: previousLessonId });
        canTakePreviousExam = !!exam; // متاح إذا كان هناك امتحان للدرس السابق
      }
    }

    // التحقق من عدد مرات المشاهدة المتبقية
    const viewCount = user.lessonViewCounts.find(v => v.lessonId.toString() === lessonId);
    const currentViews = viewCount ? viewCount.viewCount : 0;
    const viewLimit = lesson.viewLimit || 5;
    const remainingViews = Math.max(0, viewLimit - currentViews);

    // التحقق من أن المستخدم شاهد الدرس
    const hasWatched = user.watchedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    
    res.json({
      canAccessLesson,
      canTakeCurrentExam,
      canTakePreviousExam,
      isFirstLesson: currentLessonIndex === 0,
      remainingViews,
      viewLimit,
      currentViews,
      hasWatched,
      courseUnlocked,
      lessonActivation: !!lessonActivation,
      previousLessonId: previousLessonId ? previousLessonId.toString() : null,
      debug: {
        currentLessonIndex,
        previousLessonId: previousLessonId ? previousLessonId.toString() : null,
        courseUnlocked,
        lessonActivation: lessonActivation ? {
          video: lessonActivation.video,
          assignment: lessonActivation.assignment
        } : null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// API لجلب حالة الدرس (للامتحانات)
router.get('/:courseId/lesson-status/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const userId = req.user.userId;

    // جلب المستخدم
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // جلب الكورس
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'الكورس غير موجود' });

    // البحث عن الدرس
    const lesson = course.lessons.find(l => l._id.toString() === lessonId);
    if (!lesson) return res.status(404).json({ message: 'الدرس غير موجود' });

    // تحديد موقع الدرس في الكورس
    const currentLessonIndex = course.lessons.findIndex(l => l._id.toString() === lessonId);
    const previousLesson = currentLessonIndex > 0 ? course.lessons[currentLessonIndex - 1] : null;
    const previousLessonId = previousLesson ? previousLesson._id : null;

    // التحقق من شراء الكورس
    const courseUnlocked = user.purchasedCourses.includes(courseId);

    // التحقق من شراء الدرس
    const lessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    // التحقق من مشاهدة الدرس
    const hasWatched = user.watchedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    // التحقق من إمكانية أخذ امتحان الدرس الحالي
    let canTakeCurrentExam = false;
    if (currentLessonIndex === 0) {
      // الدرس الأول متاح دائماً للامتحان
      canTakeCurrentExam = true;
    } else if (courseUnlocked || lessonActivation) {
      // يمكن أخذ الامتحان إذا كان الكورس مشترى أو الدرس مشترى
      canTakeCurrentExam = true;
    }

    // التحقق من وجود امتحان للدرس السابق
    let hasExam = false;
    if (previousLessonId) {
      try {
        // البحث عن امتحان للدرس السابق
        const exam = await Exam.findOne({ lessonId: previousLessonId });
        hasExam = !!exam;
      } catch (err) {
        hasExam = false;
      }
    }

    // التحقق من إمكانية أخذ امتحان الدرس السابق
    let canTakePreviousExam = false;
    if (previousLessonId && hasExam) {
      // يمكن أخذ امتحان الدرس السابق إذا كان موجود وله امتحان
      canTakePreviousExam = true;
    }

    // التحقق من إمكانية الوصول للدرس
    let canAccessLesson = false;
    if (currentLessonIndex === 0) {
      // الدرس الأول متاح دائماً
      canAccessLesson = true;
    } else if (courseUnlocked) {
      canAccessLesson = true;
    } else if (lessonActivation) {
      canAccessLesson = true;
    } else {
      // التحقق من نجاح امتحان الدرس السابق (50% أو أكثر)
      if (previousLessonId) {
        const previousExamScore = user.examScores.find(score => 
          score.lessonId && score.lessonId.toString() === previousLessonId.toString()
        );
        
        if (previousExamScore) {
          // يمكن الوصول إذا نجح في الامتحان السابق بنسبة 50% أو أكثر
          canAccessLesson = previousExamScore.score >= 50;
        } else {
          // لا يمكن الوصول إذا لم يكن هناك امتحان سابق
          canAccessLesson = false;
        }
      } else {
        canAccessLesson = false;
      }
    }

    res.json({
      canAccessLesson,
      canTakeCurrentExam,
      canTakePreviousExam,
      isFirstLesson: currentLessonIndex === 0,
      courseUnlocked,
      lessonActivation: !!lessonActivation,
      hasWatched,
      hasExam,
      previousLessonId: previousLessonId ? previousLessonId.toString() : null
    });

  } catch (err) {
    console.error('Error in lesson-status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// إعادة تعيين حالة الدروس المشتراة للمستخدم (للتجربة)
router.post('/reset-user-lessons', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    
    // إعادة تعيين الدروس المشتراة
    user.purchasedLessons = [];
    await user.save();
    
    res.json({ 
      message: 'تم إعادة تعيين الدروس المشتراة',
      purchasedLessons: user.purchasedLessons 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// إضافة درس جديد للكورس المفعل
router.post('/:courseId/add-lesson-to-activated-users', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lessonId } = req.body;
    
    if (!lessonId) {
      return res.status(400).json({ message: 'يجب تحديد معرف الدرس' });
    }
    
    // جلب جميع المستخدمين الذين اشتروا هذا الكورس
    const users = await User.find({
      purchasedCourses: courseId
    });
    
    let updatedCount = 0;
    
    for (const user of users) {
      // تحويل البيانات القديمة
      user.purchasedLessons = (user.purchasedLessons || []).map(l => {
        if (typeof l === 'object' && l.lessonId) {
          return {
            lessonId: l.lessonId,
            video: l.video !== undefined ? l.video : true,
            assignment: l.assignment !== undefined ? l.assignment : true
          };
        } else {
          return { lessonId: l, video: true, assignment: true };
        }
      });
      
      // التحقق من أن الدرس غير موجود بالفعل
      const lessonExists = user.purchasedLessons.some(l => 
        l.lessonId && l.lessonId.toString() === lessonId
      );
      
      if (!lessonExists) {
        user.purchasedLessons.push({ 
          lessonId: lessonId, 
          video: true, 
          assignment: true 
        });
        await user.save();
        updatedCount++;
      }
    }
    
    res.json({ 
      message: `تم إضافة الدرس لـ ${updatedCount} مستخدم`,
      updatedCount 
    });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

module.exports = router; 