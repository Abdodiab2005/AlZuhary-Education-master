const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
  videoUrl: { type: String },
  assignmentUrl: { type: String },
  image: { type: String },
  viewLimit: { type: Number, default: 5 },
  viewPrice: { type: Number, default: 10 } // سعر مرة المشاهدة الإضافية
});

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  price: { type: Number, required: true },
  grade: { type: String, enum: ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'], required: true },
  lessons: [lessonSchema]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema); 