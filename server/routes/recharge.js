const express = require('express');
const RechargeCode = require('../models/RechargeCode');
const User = require('../models/User');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Error handling middleware for recharge routes
router.use((err, req, res, next) => {
  console.error('Recharge route error:', err);
  res.status(500).json({ 
    message: 'خطأ في إعادة الشحن', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'خطأ داخلي'
  });
});

// شحن الرصيد بكود
router.post('/use', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'يرجى إدخال كود الشحن' });
    const rechargeCode = await RechargeCode.findOne({ code });
    if (!rechargeCode) return res.status(404).json({ message: 'الكود غير صحيح' });
    if (rechargeCode.used) return res.status(400).json({ message: 'تم استخدام الكود من قبل' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    // إضافة الرصيد
    user.credits += rechargeCode.value;
    await user.save();
    // تحديث الكود
    rechargeCode.used = true;
    rechargeCode.usedBy = user._id;
    rechargeCode.usedAt = new Date();
    await rechargeCode.save();
    res.json({ message: 'تم شحن الرصيد بنجاح', credits: user.credits });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

// جلب رصيد المستخدم
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json({ credits: user.credits });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

// إنشاء أكواد شحن جديدة (إضافة مجموعة أكواد دفعة واحدة)
router.post('/generate', async (req, res) => {
  try {
    const { codes } = req.body; // codes: [{ code, value }]
    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ message: 'يرجى إرسال الأكواد بشكل صحيح' });
    }
    // تحقق من عدم تكرار الأكواد
    const existingCodes = await RechargeCode.find({ code: { $in: codes.map(c => c.code) } });
    if (existingCodes.length > 0) {
      return res.status(400).json({ message: 'بعض الأكواد موجودة بالفعل', existing: existingCodes.map(c => c.code) });
    }
    // حفظ الأكواد
    await RechargeCode.insertMany(codes.map(c => ({ code: c.code, value: c.value })));
    res.json({ message: 'تم حفظ الأكواد بنجاح', count: codes.length });
  } catch (err) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: err.message });
  }
});

module.exports = router; 