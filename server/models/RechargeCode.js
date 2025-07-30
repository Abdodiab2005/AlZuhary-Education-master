const mongoose = require('mongoose');

const rechargeCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
  used: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('RechargeCode', rechargeCodeSchema); 