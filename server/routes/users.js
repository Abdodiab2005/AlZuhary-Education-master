const express = require('express');
const User = require('../models/User');
const mongoose = require('mongoose'); // تأكد من وجود هذا السطر في أعلى الملف
const bcrypt = require('bcryptjs'); // لإضافة تشفير الباسورد

const router = express.Router();

// Error handling middleware for users routes
router.use((err, req, res, next) => {
  console.error('Users route error:', err);
  res.status(500).json({ 
    message: 'خطأ في المستخدمين', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// جلب جميع المستخدمين
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    // أرجع resetRequested مع كل مستخدم
    const usersWithReset = users.map(u => ({
      ...u.toObject(),
      resetRequested: !!u.resetRequested,
      examScores: u.examScores || [] // إضافة examScores
    }));
    res.json(usersWithReset);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// حذف مستخدم
router.delete('/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تعديل بيانات مستخدم
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }

    // إذا تم تغيير الباسورد، شفره وأعد resetRequested إلى false
    if (req.body.password) {
      user.password = await bcrypt.hash(req.body.password, 10);
      user.resetRequested = false;
      // لا ترسل الباسورد العادي لباقي Object.assign
      delete req.body.password;
    }

    // تحديث البيانات العادية
    Object.assign(user, req.body);

    // تفعيل المستخدم مع كورسات أو دروس (استبدال كامل)
    if (req.body.active === true) {

      const Course = require('../models/Course');
      // دعم الطريقة الجديدة: lessonActivations
      if (Array.isArray(req.body.lessonActivations)) {
        // تحديث الكورسات إذا وصلت
        if (Array.isArray(req.body.courseIds)) {
          // استبدال الكورسات بالكامل بما تم اختياره فقط (حتى لو كانت مشتراة أونلاين)
          user.purchasedCourses = req.body.courseIds.map(id => new mongoose.Types.ObjectId(id));
        }
        // إذا لم يتم إرسال courseIds، لا تغير الكورسات الموجودة (للحفاظ على الدروس المنفردة)
        // دمج الدروس الجديدة مع القديمة
        let oldLessons = Array.isArray(user.purchasedLessons) ? user.purchasedLessons.slice() : [];
        oldLessons = oldLessons.map(l => {
          if (typeof l === 'object' && l.lessonId) {
            return {
              lessonId: l.lessonId,
              video: l.video !== undefined ? l.video : true,
              assignment: l.assignment !== undefined ? l.assignment : true,
              exam: l.exam !== undefined ? l.exam : false
            };
          } else {
            return { lessonId: l.toString(), video: true, assignment: true };
          }
        });
        const lessonsMap = {};
        oldLessons.forEach(l => { lessonsMap[l.lessonId.toString()] = { ...l }; });
        req.body.lessonActivations.forEach(act => {
          if (!act.lessonId || !mongoose.Types.ObjectId.isValid(act.lessonId)) return;
          const idStr = act.lessonId.toString();
          if (lessonsMap[idStr]) {
            lessonsMap[idStr].video = !!act.video;
            lessonsMap[idStr].assignment = true; // الواجب متاح دائماً
          } else {
            lessonsMap[idStr] = {
              lessonId: new mongoose.Types.ObjectId(act.lessonId),
              video: !!act.video,
              assignment: true // الواجب متاح دائماً
            };
          }
        });
        // احذف الدروس التي لم يعد لها أي تفعيل (حتى لو كانت مشتراة)
        user.purchasedLessons = Object.values(lessonsMap).filter(l => l.video);
      }

      // إضافة امتحانات الدرس السابق بنسبة 50% إذا تم إرسالها
      console.log('Exam scores received:', req.body.examScores);
      if (Array.isArray(req.body.examScores) && req.body.examScores.length > 0) {
        req.body.examScores.forEach(examScore => {
          try {
            const examId = examScore.examId || examScore.lessonId;
            if (examId && mongoose.Types.ObjectId.isValid(examId)) {
              // البحث عن امتحان موجود أو إنشاء جديد
              const existingScoreIndex = user.examScores.findIndex(score => 
                score.examId && score.examId.toString() === examId.toString()
              );
              
              if (existingScoreIndex >= 0) {
                // تحديث الامتحان الموجود
                user.examScores[existingScoreIndex] = {
                  examId: new mongoose.Types.ObjectId(examId),
                  lessonId: new mongoose.Types.ObjectId(examScore.lessonId || examId),
                  score: examScore.score || 50,
                  total: examScore.total || 100,
                  passed: examScore.passed || true,
                  date: new Date()
                };
              } else {
                // إضافة امتحان جديد
                user.examScores.push({
                  examId: new mongoose.Types.ObjectId(examId),
                  lessonId: new mongoose.Types.ObjectId(examScore.lessonId || examId),
                  score: examScore.score || 50,
                  total: examScore.total || 100,
                  passed: examScore.passed || true,
                  date: new Date()
                });
              }
            }
          } catch (err) {
            console.error('Error processing exam score:', err);
          }
        });
      }

 if (Array.isArray(req.body.courseIds)) {
        // إذا وصل courseIds، استبدل القائمة بالكامل
        const validCourses = [];
        let allLessons = [];
        for (const courseId of req.body.courseIds) {
          if (!mongoose.Types.ObjectId.isValid(courseId)) continue;
          const course = await Course.findById(courseId);
          if (course) {
            validCourses.push(new mongoose.Types.ObjectId(course._id));
            if (course.lessons) {
              allLessons.push(...course.lessons.map(lesson => ({ lessonId: lesson._id, video: true, assignment: true })));
            }
          }
        }
        user.purchasedCourses = validCourses; // استبدال كامل
        // إذا وصل lessonIds أيضًا، أضفهم
        if (Array.isArray(req.body.lessonIds)) {
          for (const id of req.body.lessonIds) {
            if (mongoose.Types.ObjectId.isValid(id)) {
              allLessons.push({ lessonId: new mongoose.Types.ObjectId(id), video: true, assignment: true });
            }
          }
        }
        // إزالة التكرار بناءً على lessonId
        const lessonsMap = {};
        allLessons.forEach(l => { lessonsMap[l.lessonId.toString()] = l; });
        user.purchasedLessons = Object.values(lessonsMap); // استبدال كامل
      } else if (Array.isArray(req.body.lessonIds)) {
        // إذا فقط lessonIds، استبدل قائمة الدروس فقط
        user.purchasedLessons = req.body.lessonIds.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => ({ lessonId: new mongoose.Types.ObjectId(id), video: true, assignment: true }));
      }
      // دعم الطريقة القديمة (كورس واحد أو درس واحد)
      if (req.body.courseId) {
        if (mongoose.Types.ObjectId.isValid(req.body.courseId) && !user.purchasedCourses.map(id => id.toString()).includes(req.body.courseId)) {
          const course = await Course.findById(req.body.courseId);
          if (course) {
            user.purchasedCourses.push(new mongoose.Types.ObjectId(req.body.courseId));
            if (course.lessons) {
              course.lessons.forEach(lesson => {
                if (!user.purchasedLessons.some(l => l.lessonId && l.lessonId.toString() === lesson._id.toString())) {
                  user.purchasedLessons.push({ lessonId: lesson._id, video: true, assignment: true });
                }
              });
            }
          }
        }
      } else if (req.body.lessonId) {
        if (mongoose.Types.ObjectId.isValid(req.body.lessonId) && !user.purchasedLessons.some(l => l.lessonId && l.lessonId.toString() === req.body.lessonId)) {
          user.purchasedLessons.push({ lessonId: new mongoose.Types.ObjectId(req.body.lessonId), video: true, assignment: true });
        }
      }
    }
    await user.save();
    

    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
  }
});



module.exports = router; 