require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Task = require('./models/Task');
const User = require('./models/User');

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

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
const requireJson = (req, res, next) =>
  req.is('application/json') ? next() : res.status(415).json({ error: 'Content-Type must be application/json' });

function validateCredentials(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Valid email and password (8–128 characters) are required' });
  }
  req.normalizedEmail = email.trim().toLowerCase();
  next();
}

function requireAuth(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Unauthorized', message: 'No token provided. Include Authorization: Bearer <token> header.' });
  try {
    const decoded = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}
function validateId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid task ID format' });
  next();
}
const allowed = ['title', 'description', 'priority', 'completed'];
function validateTask(req, res, next) {
  const body = req.body;
  const creating = req.method === 'POST';
  if (!body || Array.isArray(body) || typeof body !== 'object' || (creating && (typeof body.title !== 'string' || !body.title.trim())) ||
      (!creating && Object.keys(body).length === 0)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Task title is required when creating; update body cannot be empty' });
  }
  if (Object.keys(body).some(k => !allowed.includes(k)) ||
      ('title' in body && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 150)) ||
      ('description' in body && typeof body.description !== 'string') ||
      ('completed' in body && typeof body.completed !== 'boolean') ||
      ('priority' in body && !['low', 'medium', 'high'].includes(body.priority))) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid task fields or values' });
  }
  if (typeof body.title === 'string') body.title = body.title.trim();
  next();
}

app.post('/register', requireJson, validateCredentials, asyncRoute(async (req, res) => {
  const existing = await User.findOne({ email: req.normalizedEmail });
  if (existing) return res.status(400).json({ error: 'Bad Request', message: 'A user with this email already exists' });
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({ email: req.normalizedEmail, password: hashedPassword });
  res.status(201).json({ message: 'User registered successfully', user: { id: user.id, email: user.email } });
}));

app.post('/login', requireJson, validateCredentials, asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.normalizedEmail }).select('+password');
  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
  res.status(200).json({ message: 'Login successful', token, expiresIn: 3600, user: { id: user.id, email: user.email } });
}));
app.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const user = await User.findById(req.user.id).select('email createdAt');
  if (!user) return res.status(401).json({ error: 'Unauthorized', message: 'User no longer exists' });
  res.json({ id: user.id, email: user.email, createdAt: user.createdAt });
}));

app.use('/tasks', requireAuth);
app.get('/tasks', asyncRoute(async (req, res) => {
  const tasks = await Task.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json(tasks);
}));
app.get('/tasks/:id', validateId, asyncRoute(async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user.id });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));
app.post('/tasks', requireJson, validateTask, asyncRoute(async (req, res) => {
  const task = await Task.create({ ...req.body, owner: req.user.id });
  res.location('/tasks/' + task._id).status(201).json({ message: 'Task created successfully', task });
}));
app.put('/tasks/:id', requireJson, validateId, validateTask, asyncRoute(async (req, res) => {
  const task = await Task.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, { $set: req.body }, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task updated successfully', task });
}));
app.delete('/tasks/:id', validateId, asyncRoute(async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ message: 'Task deleted successfully', task });
}));

app.use((req, res) => res.status(404).json({ error: 'Route not found', method: req.method, path: req.path }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 11000) return res.status(400).json({ error: 'Bad Request', message: 'A user with this email already exists' });
  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(Object.entries(err.errors).map(([field, detail]) => [field, detail.message]));
    return res.status(400).json({ error: 'Validation failed', details });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid field value' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing. Create a local .env file');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be a random value of at least 32 characters in .env');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('MongoDB connected successfully');
  return app.listen(PORT, () => console.log(`Task Manager API running on http://localhost:${PORT}`));
}
if (require.main === module) start().catch(err => { console.error('Startup failed:', err.message); process.exitCode = 1; });
module.exports = { app, start, requireAuth, validateTask };
