const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  videoUrl: { type: String },
  assignmentUrl: { type: String },
  image: { type: String },
  viewLimit: { type: Number, default: 5 },
  viewPrice: { type: Number, default: 10 }, // سعر مرة المشاهدة الإضافية
  isHidden: { type: Boolean, default: false }, // إخفاء الدرس عن الطلاب
  hasExam: { type: Boolean, default: false }, // تحديد ما إذا كان الدرس له امتحان أم لا
  previousLessonRequired: { type: Boolean } // تحديد ما إذا كان مطلوب نجاح في الحصة السابقة (بدون قيمة افتراضية)
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  price: { type: Number, required: true },
  grade: { type: String, enum: ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'], required: true },
  lessons: [lessonSchema]
}, { timestamps: true });

// إضافة فهارس لتحسين الأداء
courseSchema.index({ 'lessons._id': 1 });
courseSchema.index({ grade: 1 });

module.exports = mongoose.model('Course', courseSchema); 