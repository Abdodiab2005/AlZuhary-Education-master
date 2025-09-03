const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true  , unique: true },
  type: { type: String, enum: ['Student', 'Admin', 'Teacher'], required: true },
  parentPhoneNumber: { type: String },
  center: { type: String },
  grade: { type: String, enum: ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'] },
  email: { type: String },
  active: { type: Boolean, default: false },
  credits: { type: Number, default: 0 },
  purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  purchasedLessons: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    video: { type: Boolean, default: false },
    assignment: { type: Boolean, default: false },
    exam: { type: Boolean, default: false }
  }],
  resetRequested: { type: Boolean, default: false },
  examScores: [{
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    date: { type: Date, default: Date.now }
  }],
  watchedLessons: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: Date, default: Date.now }
  }],
  lessonViewCounts: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, required: true },
    viewCount: { type: Number, default: 0 }
  }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);