const mongoose = require('mongoose');

// نموذج الإجابة
const answerSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

// نموذج السؤال
const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: { type: String },
  answers: [answerSchema],
  correctAnswerIndex: { type: Number, required: true },
  points: { type: Number, default: 1 }
});

// نموذج الامتحان
const examSchema = new mongoose.Schema({
  name: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  examType: { type: String, required: true, enum: ['current', 'previous'] }, // مطلوب - حالي أو سابق فقط
  questions: [questionSchema],
  totalPoints: { type: Number, default: 0 },
  passingScore: { type: Number, default: 50 },
  enabled: { type: Boolean, default: true }
}, { 
  timestamps: true
});

// Middleware لحساب النقاط الإجمالية
examSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, question) => {
      return total + (question.points || 1);
    }, 0);
  }
  next();
});

// Method لحساب النتيجة
examSchema.methods.calculateScore = function(userAnswers) {
  let score = 0;
  let totalPossible = 0;
  
  this.questions.forEach((question, index) => {
    totalPossible += question.points || 1;
    if (userAnswers[index] === question.correctAnswerIndex) {
      score += question.points || 1;
    }
  });
  
  return {
    score,
    totalPossible,
    percentage: Math.round((score / totalPossible) * 100)
  };
};

module.exports = mongoose.model('Exam', examSchema); 