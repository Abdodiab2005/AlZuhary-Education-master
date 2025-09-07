const express = require('express');
const Exam = require('../models/Exam');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');
const { authenticateToken } = require('./auth');

const router = express.Router();

// إنشاء/تحديث امتحان
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, courseId, lessonId, examType, questions } = req.body;
    
    // التحقق من البيانات
    if (!name || !courseId || !lessonId || !examType || !questions || questions.length === 0) {
      return res.status(400).json({ message: 'جميع البيانات مطلوبة' });
    }
    
    // التحقق من نوع الامتحان
    if (!['current', 'previous'].includes(examType)) {
      return res.status(400).json({ message: 'نوع الامتحان يجب أن يكون current أو previous' });
    }
    
    // البحث عن امتحان موجود للدرس ونفس النوع
    const existingExam = await Exam.findOne({ lessonId, examType });
    
    if (existingExam) {
      // منع إنشاء امتحان جديد إذا كان موجود
      return res.status(400).json({ 
        message: `يوجد امتحان ${examType === 'current' ? 'حالي' : 'سابق'} لهذا الدرس بالفعل. استخدم زر التحديث لتعديله.`,
        existingExam: existingExam,
        examId: existingExam._id
      });
    }
    
    // إنشاء امتحان جديد
    const newExam = new Exam({
      name,
      courseId,
      lessonId,
      examType,
      questions
    });
    
    await newExam.save();
    console.log('DB Write: CREATE_EXAM', {
      examId: newExam._id.toString(),
      lessonId,
      courseId,
      examType,
      questionsCount: questions.length
    });
    
    // تم إزالة منطق تعديل الدرجات 51/0 عند إنشاء امتحان سابق
    
    res.status(201).json({ 
      message: 'تم إنشاء امتحان جديد بنجاح', 
      exam: newExam, 
      updated: false,
      examId: newExam._id
    });
    
  } catch (err) {
    console.error('Error creating/updating exam:', err);
    res.status(500).json({ 
      message: 'خطأ في إنشاء/تحديث الامتحان', 
      error: err.message 
    });
  }
});

// جلب امتحانات درس معين
router.get('/lesson/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    
    const exams = await Exam.find({ lessonId }).sort({ createdAt: -1 });
    
    const organizedExams = {
      current: exams.find(exam => exam.examType === 'current'),
      previous: exams.find(exam => exam.examType === 'previous')
    };
    
    res.json({
      message: `تم العثور على ${exams.length} امتحان للدرس`,
      total: exams.length,
      organized: organizedExams,
      all: exams
    });
  } catch (err) {
    console.error('Error fetching exams for lesson:', err);
    res.status(500).json({ 
      message: 'خطأ في جلب الامتحانات', 
      error: err.message 
    });
  }
});

// تصحيح الامتحان وتسجيل الدرجة
router.post('/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    
    // حساب النتيجة
    const result = exam.calculateScore(answers);
    const passed = result.percentage >= exam.passingScore;
    
    // تسجيل الدرجة للمستخدم
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // التحقق من أن المستخدم قد أخذ هذا الامتحان من قبل
    const existingScoreIndex = user.examScores.findIndex(e => e.examId.toString() === exam._id.toString());
    
    if (existingScoreIndex !== -1) {
      // تحديث النتيجة الموجودة
      user.examScores[existingScoreIndex] = {
        examId: exam._id,
        lessonId: exam.lessonId,
        score: result.score,
        total: result.totalPossible,
        passed
      };
    } else {
      // تسجيل النتيجة الجديدة
      user.examScores.push({
        examId: exam._id,
        lessonId: exam.lessonId,
        score: result.score,
        total: result.totalPossible,
        passed
      });
    }
    await user.save();
    console.log('DB Write: SUBMIT_EXAM_SCORE', {
      userId: user._id.toString(),
      examId: exam._id.toString(),
      lessonId: exam.lessonId.toString(),
      score: result.score,
      total: result.totalPossible,
      percentage: result.percentage,
      passed
    });
    
    res.json({ 
      score: result.score, 
      total: result.totalPossible, 
      percentage: result.percentage,
      passed 
    });
  } catch (err) {
    console.error('Error submitting exam:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تحديث امتحان
router.put('/:examId', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        const { name, courseId, lessonId, examType, questions } = req.body;
        
        // التحقق من البيانات
        if (!name || !courseId || !lessonId || !examType || !questions || questions.length === 0) {
            return res.status(400).json({ message: 'جميع البيانات مطلوبة' });
        }
        
        // التحقق من نوع الامتحان
        if (!['current', 'previous'].includes(examType)) {
            return res.status(400).json({ message: 'نوع الامتحان يجب أن يكون current أو previous' });
        }
        
        // البحث عن الامتحان
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'الامتحان غير موجود' });
        }
        
        // التحقق من أن المستخدم هو Admin أو Teacher
        const user = await User.findById(req.user.userId);
        if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
            return res.status(403).json({ message: 'غير مصرح لك بتحديث الامتحانات' });
        }
        
        // التحقق من عدم وجود امتحان آخر بنفس النوع لنفس الدرس
        const existingExam = await Exam.findOne({ 
            lessonId, 
            examType, 
            _id: { $ne: examId } 
        });
        
        if (existingExam) {
            return res.status(400).json({ 
                message: `يوجد امتحان ${examType === 'current' ? 'حالي' : 'سابق'} آخر لهذا الدرس` 
            });
        }
        
        // تحديث الامتحان
        const updatedExam = await Exam.findByIdAndUpdate(
            examId,
            { name, courseId, lessonId, examType, questions },
            { new: true, runValidators: true }
        );
        console.log('DB Write: UPDATE_EXAM', {
          examId,
          courseId,
          lessonId,
          examType,
          questionsCount: questions.length
        });
        
        res.json({
            message: 'تم تحديث الامتحان بنجاح',
            exam: updatedExam
        });
        
    } catch (err) {
        console.error('Error updating exam:', err);
        res.status(500).json({
            message: 'خطأ في تحديث الامتحان',
            error: err.message
        });
    }
});

// حذف امتحان
router.delete('/:examId', authenticateToken, async (req, res) => {
    try {
        const { examId } = req.params;
        
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'الامتحان غير موجود' });
        }
        
        // التحقق من أن المستخدم هو Admin أو Teacher
        const user = await User.findById(req.user.userId);
        if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
            return res.status(403).json({ message: 'غير مصرح لك بحذف الامتحانات' });
        }
        
        await Exam.findByIdAndDelete(examId);
        console.log('DB Write: DELETE_EXAM', { examId });
        
        res.json({ 
            message: 'تم حذف الامتحان بنجاح',
            deletedExamId: examId
        });
        
    } catch (err) {
        console.error('Error deleting exam:', err);
        res.status(500).json({ 
            message: 'خطأ في حذف الامتحان', 
            error: err.message 
        });
    }
});



// API لتحديث درجة الطالب لـ 0 عند إضافة امتحان سابق
router.post('/reset-score/:lessonId', authenticateToken, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.userId;

        // جلب المستخدم
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'المستخدم غير موجود' });
        }

        // البحث عن درجة الطالب للدرس
        const scoreIndex = user.examScores.findIndex(score => 
            score.lessonId && score.lessonId.toString() === lessonId
        );

        if (scoreIndex !== -1) {
            // تحديث الدرجة لـ 0
            user.examScores[scoreIndex].score = 0;
            user.examScores[scoreIndex].passed = false;
            user.examScores[scoreIndex].date = new Date();
            
            await user.save();

            res.json({ 
                message: 'تم تحديث درجة الطالب لـ 0', 
                score: user.examScores[scoreIndex] 
            });
        } else {
            res.json({ 
                message: 'لم يتم العثور على درجة للطالب في هذا الدرس' 
            });
        }

    } catch (err) {
        console.error('Error in reset-score:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// تفعيل امتحان سابق لدرس (enabled=true)
router.put('/lesson/:lessonId/previous/enable', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const result = await Exam.updateMany({ lessonId, examType: 'previous' }, { $set: { enabled: true } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'لا يوجد امتحان سابق لهذا الدرس' });
    }

    res.json({ message: 'تم تفعيل الامتحان السابق', enabled: true, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST alias
router.post('/lesson/:lessonId/previous/enable', authenticateToken, async (req, res) => {
  req.method = 'PUT';
  return router.handle(req, res);
});

// تعطيل امتحان سابق لدرس (enabled=false)
router.put('/lesson/:lessonId/previous/disable', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const result = await Exam.updateMany({ lessonId, examType: 'previous' }, { $set: { enabled: false } });
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'لا يوجد امتحان سابق لهذا الدرس' });
    }

    res.json({ message: 'تم تعطيل الامتحان السابق', enabled: false, matched: result.matchedCount, modified: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST alias
router.post('/lesson/:lessonId/previous/disable', authenticateToken, async (req, res) => {
  req.method = 'PUT';
  return router.handle(req, res);
});

// تفعيل امتحان سابق محدد (بالـ examId)
router.put('/:examId/previous/enable', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'الامتحان غير موجود' });
    if (exam.examType !== 'previous') return res.status(400).json({ message: 'هذا الامتحان ليس من نوع previous' });

    exam.enabled = true;
    await exam.save();

    res.json({ message: 'تم تفعيل الامتحان السابق', enabled: true, examId: exam._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST alias
router.post('/:examId/previous/enable', authenticateToken, async (req, res) => {
  req.method = 'PUT';
  return router.handle(req, res);
});

// تعطيل امتحان سابق محدد (بالـ examId)
router.put('/:examId/previous/disable', authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user || (user.type !== 'Admin' && user.type !== 'Teacher')) {
      return res.status(403).json({ message: 'غير مصرح' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'الامتحان غير موجود' });
    if (exam.examType !== 'previous') return res.status(400).json({ message: 'هذا الامتحان ليس من نوع previous' });

    exam.enabled = false;
    await exam.save();

    res.json({ message: 'تم تعطيل الامتحان السابق', enabled: false, examId: exam._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// POST alias
router.post('/:examId/previous/disable', authenticateToken, async (req, res) => {
  req.method = 'PUT';
  return router.handle(req, res);
});

module.exports = router; 