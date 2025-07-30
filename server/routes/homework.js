const express = require('express');
const router = express.Router();
const HomeworkLink = require('../models/HomeworkLink');

// إضافة أو تحديث رابط الواجب حسب السنة
router.post('/', async (req, res) => {
  const { url, year_stage } = req.body;
  const link = await HomeworkLink.findOneAndUpdate(
    { year_stage },
    { url },
    { new: true, upsert: true }
  );
  res.status(201).json(link);
});

// جلب الواجبات حسب السنة
router.get('/:year_stage', async (req, res) => {
  const { year_stage } = req.params;
  const links = await HomeworkLink.find({ year_stage });
  res.json(links);
});

module.exports = router; 