const express = require('express');
const router = express.Router();
const FileLink = require('../models/FileLink');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// إضافة أو تحديث رابط الملف حسب السنة
router.post('/', async (req, res) => {
  const { url, year_stage } = req.body;
  const link = await FileLink.findOneAndUpdate(
    { year_stage },
    { url },
    { new: true, upsert: true }
  );
  res.status(201).json(link);
});

// رفع صورة/ملف عام
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'لم يتم رفع أي ملف' });
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});

// جلب الملفات حسب السنة
router.get('/:year_stage', async (req, res) => {
  const { year_stage } = req.params;
  const links = await FileLink.find({ year_stage });
  res.json(links);
});

module.exports = router; 