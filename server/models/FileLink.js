const mongoose = require('mongoose');
const FileLinkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  year_stage: { type: String, required: true }
});
module.exports = mongoose.model('FileLink', FileLinkSchema); 