const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: { type: String },
  answers: [answerSchema],
  correctAnswerIndex: { type: Number, required: true },
});

module.exports = mongoose.model('Question', questionSchema); 