require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Task = require('./models/Task');

const app = express();
const PORT = process.env.PORT || 5000;

app.use((req, res, next) => {
  const entry = `${new Date().toISOString()} | ${req.method} | ${req.originalUrl}\n`;
  console.log(entry.trim());
  fs.appendFile(path.join(__dirname, 'requests.log'), entry, err => {
    if (err) console.error('Logging failed:', err.message);
  });
  next();
});
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const requireJson = (req, res, next) =>
  req.is('application/json') ? next() : res.status(415).json({ error: 'Content-Type must be application/json' });

function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid task ID format' });
  next();
}

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.get('/tasks', asyncRoute(async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.status(200).json(tasks);
}));

app.get('/tasks/:id', validateId, asyncRoute(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(200).json(task);
}));

app.post('/tasks', requireJson, asyncRoute(async (req, res) => {
  const task = await Task.create(req.body);
  res.location('/tasks/' + task._id).status(201).json({ message: 'Task created successfully', task });
}));

app.put('/tasks/:id', requireJson, validateId, asyncRoute(async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id, { $set: req.body }, { new: true, runValidators: true, context: 'query' }
  );
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(200).json({ message: 'Task updated successfully', task });
}));

app.delete('/tasks/:id', validateId, asyncRoute(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(200).json({ message: 'Task deleted successfully', task });
}));

app.use((req, res) => res.status(404).json({ error: 'Route not found', method: req.method, path: req.path }));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'ValidationError') {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([field, detail]) => [field, detail.message]));
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid field value' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  const status = err.status || err.statusCode || 500;
  res.status(status >= 400 && status < 500 ? status : 500)
    .json({ error: status >= 500 ? 'Internal server error' : err.message });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing. Create .env using .env.example');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected successfully');
  return app.listen(PORT, () => console.log(`Task Manager API running on http://localhost:${PORT}`));
}
if (require.main === module) {
  start().catch(err => { console.error('Startup failed:', err.message); process.exitCode = 1; });
}
module.exports = { app, start };
