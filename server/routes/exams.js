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
    
    // التحقق من أن المستخدم لم يسبق له أخذ هذا الامتحان
    const already = user.examScores.find(e => e.examId.toString() === exam._id.toString());
    if (already) {
      return res.status(400).json({ 
        message: 'لقد أخذت هذا الامتحان من قبل',
        previousScore: {
          score: already.score,
          total: already.total,
          percentage: Math.round((already.score / already.total) * 100),
          passed: already.passed
        }
      });
    }
    
    // تسجيل النتيجة الجديدة
    user.examScores.push({
      examId: exam._id,
      lessonId: exam.lessonId,
      score: result.score,
      total: result.totalPossible,
      passed
    });
    await user.save();
    
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
        if (!user || (user.userType !== 'Admin' && user.userType !== 'Teacher')) {
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
        if (!user || (user.userType !== 'Admin' && user.userType !== 'Teacher')) {
            return res.status(403).json({ message: 'غير مصرح لك بحذف الامتحانات' });
        }
        
        await Exam.findByIdAndDelete(examId);
        
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

module.exports = router; 