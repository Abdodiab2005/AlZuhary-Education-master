const express = require('express');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Error handling middleware for exams routes
router.use((err, req, res, next) => {
  console.error('Exams route error:', err);
  res.status(500).json({ 
    message: 'خطأ في الاختبارات', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// جلب كل الامتحانات
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find().populate('questions');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Middleware للتحقق من token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// إضافة امتحان جديد لدرس معين
router.post('/', async (req, res) => {
  try {
    const { name, courseId, lessonId, questions } = req.body;
    // إنشاء الأسئلة أولاً
    const createdQuestions = await Question.insertMany(questions);
    const questionIds = createdQuestions.map(q => q._id);
    const exam = new Exam({ name, courseId, lessonId, questions: questionIds });
    await exam.save();
    res.status(201).json(exam);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب كل امتحانات درس معين
router.get('/lesson/:lessonId', authenticateToken, async (req, res) => {
  try {
    const exams = await Exam.find({ lessonId: req.params.lessonId }).populate('questions');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب كل امتحانات كورس معين
router.get('/course/:courseId', async (req, res) => {
  try {
    const exams = await Exam.find({ courseId: req.params.courseId }).populate('questions');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// إضافة سؤال لامتحان معين
router.post('/:examId/question', async (req, res) => {
  try {
    const { text, image, answers, correctAnswerIndex } = req.body;
    const question = new Question({ text, image, answers, correctAnswerIndex });
    await question.save();
    await Exam.findByIdAndUpdate(req.params.examId, { $push: { questions: question._id } });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب امتحان الدرس السابق (حسب ترتيب الدروس في الكورس)
router.get('/previous/:courseId/:lessonId', async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const lessons = course.lessons;
    const idx = lessons.findIndex(l => l._id.toString() === lessonId);
    if (idx <= 0) return res.status(404).json({ message: 'No previous lesson' });
    const previousLessonId = lessons[idx - 1]._id;
    const exam = await Exam.findOne({ lessonId: previousLessonId }).populate('questions');
    if (!exam) return res.status(404).json({ message: 'No exam for previous lesson' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// تصحيح الامتحان وتسجيل الدرجة
router.post('/:examId/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body; // answers: [index لكل سؤال]
    const exam = await Exam.findById(req.params.examId).populate('questions');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    let score = 0;
    exam.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswerIndex) score++;
    });
    const total = exam.questions.length;
    const passed = (score / total) >= 0.5;
    // سجل الدرجة للمستخدم
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // لا تسجل إلا إذا لم يكن مسجل من قبل لهذا الامتحان
    const already = user.examScores.find(e => e.examId.toString() === exam._id.toString());
    if (!already) {
      user.examScores.push({
        examId: exam._id,
        lessonId: exam.lessonId,
        score,
        total,
        passed
      });
      await user.save();
    }
    res.json({ score, total, passed });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// التحقق من إمكانية أخذ امتحان الدرس الحالي
router.get('/can-take-current/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // التحقق من تفعيل الدرس
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const lessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );
    // التحقق من أن المستخدم شاهد الفيديو أولاً
    const watched = user.watchedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    if (!watched) {
      return res.json({ canTake: false, reason: 'Video not watched' });
    }

    // التحقق من وجود امتحان للدرس
    const exam = await Exam.findOne({ lessonId });
    if (!exam) {
      return res.json({ canTake: false, reason: 'No exam available' });
    }

    res.json({ canTake: true, examId: exam._id });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// التحقق من إمكانية أخذ امتحان الدرس السابق
router.get('/can-take-previous/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // جلب الكورس للتحقق من ترتيب الدروس
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const lessons = course.lessons;
    const currentLessonIndex = lessons.findIndex(l => l._id.toString() === lessonId);
    
    // إذا كان الدرس الأول، لا يمكن أخذ امتحان سابق
    if (currentLessonIndex <= 0) {
      return res.json({ canTake: false, reason: 'No previous lesson' });
    }

    const previousLessonId = lessons[currentLessonIndex - 1]._id;

    // التحقق من وجود امتحان للدرس السابق
    const exam = await Exam.findOne({ lessonId: previousLessonId });
    if (!exam) {
      return res.json({ canTake: false, reason: 'No exam available for previous lesson' });
    }

    // التحقق من تفعيل الدرس السابق
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const previousLessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === previousLessonId.toString()
    );

    // إذا كان الكورس مفعل أو تم تفعيل الدرس السابق، يمكن أخذ الامتحان
    if (courseUnlocked || previousLessonActivation) {
      // التحقق من وجود امتحان للدرس السابق
      const exam = await Exam.findOne({ lessonId: previousLessonId });
      if (!exam) {
        return res.json({ canTake: false, reason: 'No exam available for previous lesson' });
      }
      return res.json({ canTake: true, previousLessonId });
    }

    // إذا لم يكن الكورس مفعل ولم يتم تفعيل الدرس السابق، لا يمكن أخذ الامتحان
    return res.json({ canTake: false, reason: 'Previous lesson not activated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// التحقق من إمكانية الوصول للدرس (يتطلب نجاح امتحان الدرس السابق)
router.get('/can-access-lesson/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // جلب الكورس للتحقق من ترتيب الدروس
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const lessons = course.lessons;
    const currentLessonIndex = lessons.findIndex(l => l._id.toString() === lessonId);
    
    // إذا كان الدرس الأول، يمكن الوصول إليه دائماً
    if (currentLessonIndex === 0) {
      return res.json({ canAccess: true, reason: 'First lesson' });
    }

    // التحقق من تفعيل الدرس الحالي
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const lessonActivation = user.purchasedLessons.find(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );


    // التحقق من نجاح امتحان الدرس الحالي للدرس السابق
    if (currentLessonIndex > 0) {
      const previousLessonId = lessons[currentLessonIndex - 1]._id;
      const previousExamScore = user.examScores.find(e => 
        e.lessonId && e.lessonId.toString() === previousLessonId.toString()
      );

      // إذا نجح في الامتحان الطبيعي، يمكن الوصول للدرس
      if (previousExamScore && previousExamScore.passed && 
          previousExamScore.score >= (previousExamScore.total * 0.5)) {
        return res.json({ canAccess: true, reason: 'Previous exam passed' });
      }


    }

    // إذا لم ينجح ولم يكن مفعل، لا يمكن الوصول
    if (currentLessonIndex > 0) {
      const previousLessonId = lessons[currentLessonIndex - 1]._id;
      const previousExamScore = user.examScores.find(e => 
        e.lessonId && e.lessonId.toString() === previousLessonId.toString()
      );

      return res.json({ 
        canAccess: false, 
        reason: 'Previous exam not passed with 50% or higher',
        requiredScore: previousExamScore ? (previousExamScore.total * 0.5) : 0,
        currentScore: previousExamScore ? previousExamScore.score : 0
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// جلب حالة الامتحانات للمستخدم في درس معين
router.get('/lesson-status/:courseId/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // جلب الكورس للتحقق من ترتيب الدروس
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const lessons = course.lessons;
    const currentLessonIndex = lessons.findIndex(l => l._id.toString() === lessonId);
    
    // التحقق من إمكانية الوصول للدرس
    let canAccessLesson = true;
    let previousExamPassed = true;
    
    // التحقق من تفعيل الدرس الحالي
    const courseUnlocked = user.purchasedCourses.includes(courseId);
    const lessonActivation = user.purchasedLessons.find(l => {
      if (!l.lessonId) return false;
      return l.lessonId.toString() === lessonId;
    });
 if (currentLessonIndex > 0) {
      const previousLessonId = lessons[currentLessonIndex - 1]._id;
      
      // التحقق من نجاح امتحان الدرس الحالي للدرس السابق
      const previousExamScore = user.examScores.find(e => 
        e.lessonId && e.lessonId.toString() === previousLessonId.toString()
      );
      
      // إذا نجح في الامتحان الطبيعي، يمكن الوصول للدرس
      if (previousExamScore && previousExamScore.passed && 
          previousExamScore.score >= (previousExamScore.total * 0.5)) {
        canAccessLesson = true;
        previousExamPassed = true;
      } else {
        canAccessLesson = false;
        previousExamPassed = false;
      }
    }

    // التحقق من إمكانية أخذ امتحان الدرس الحالي
    let canTakeCurrentExam = false;
    // يجب أن يشاهد الفيديو أولاً
    const watchedForExam = user.watchedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );
    canTakeCurrentExam = watchedForExam;

    // التحقق من إمكانية أخذ امتحان الدرس السابق
    let canTakePreviousExam = false;
    if (currentLessonIndex > 0) {
      const previousLessonId = lessons[currentLessonIndex - 1]._id;
      const previousLessonActivation = user.purchasedLessons.find(l => {
        if (!l.lessonId) return false;
        return l.lessonId.toString() === previousLessonId.toString();
      });
      
      // إذا كان الكورس مفعل أو تم تفعيل الدرس السابق
      if (courseUnlocked || previousLessonActivation) {
        // التحقق من وجود امتحان للدرس السابق
        const exam = await Exam.findOne({ lessonId: previousLessonId });
        canTakePreviousExam = !!exam; // متاح إذا كان هناك امتحان للدرس السابق
      }
    }

    // التحقق من عدد مرات المشاهدة المتبقية
    const lessonViewCount = user.lessonViewCounts.find(v => 
      v.lessonId && v.lessonId.toString() === lessonId
    );
    const currentViews = lessonViewCount ? lessonViewCount.viewCount : 0;
    
    // جلب معلومات الدرس
    const lesson = lessons[currentLessonIndex];
    const viewLimit = lesson ? (lesson.viewLimit || 5) : 5;
    const remainingViews = Math.max(0, viewLimit - currentViews);

    // التحقق من أن المستخدم شاهد الدرس
    const watched = user.watchedLessons.some(l => 
      l.lessonId && l.lessonId.toString() === lessonId
    );

    res.json({
      canAccessLesson,
      canTakeCurrentExam,
      canTakePreviousExam,
      previousExamPassed,
      isFirstLesson: currentLessonIndex === 0,
      remainingViews,
      watched,
      courseUnlocked,
      lessonActivated: !!lessonActivation
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router; 