const mongoose = require('mongoose');
const taskSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
  description: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { versionKey: false });
module.exports = mongoose.model('Task', taskSchema);
