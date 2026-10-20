const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const { app } = require('../server');

test('schema trims title and applies defaults', () => {
  const task = new Task({ title: '  AWDF Practical 5  ' });
  assert.equal(task.title, 'AWDF Practical 5');
  assert.equal(task.completed, false);
  assert.equal(task.priority, 'medium');
  assert.ok(task.createdAt instanceof Date);
});

test('schema rejects missing title and invalid priority', async () => {
  const task = new Task({ description: 'No title', priority: 'urgent' });
  const err = task.validateSync();
  assert.ok(err.errors.title);
  assert.ok(err.errors.priority);
});

test('404 fallback and ID format validation', async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    assert.equal((await fetch(base + '/invalid-page')).status, 404);
    assert.equal((await fetch(base + '/tasks/abc')).status, 400);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// Full CRUD requires a running MongoDB database and can be tested in Thunder Client.
