const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String, required: [true, 'Title is required'], trim: true,
    validate: { validator: value => Boolean(value && value.trim()), message: 'Title cannot be empty' }
  },
  description: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
}, { versionKey: false });

// Supplementary problem: normalize titles before saving documents.
taskSchema.pre('save', function (next) {
  if (typeof this.title === 'string') this.title = this.title.trim();
  next();
});

module.exports = mongoose.model('Task', taskSchema);
