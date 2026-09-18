

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const FEEDBACK_FILE = path.resolve(DATA_DIR, 'feedback.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

/**
 * Reads all feedback items.
 */
export function getAllFeedback() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading feedback file:', err);
    return [];
  }
}

/**
 * Adds a new bug or suggestion.
 */
export function createFeedback({ type, description, author }) {
  ensureDataDir();
  const items = getAllFeedback();
  const newItem = {
    id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    type: type === 'bug' ? 'bug' : 'suggestion',
    description: (description || '').trim(),
    author: (author || '').trim() || 'Anonymous Creature',
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  items.push(newItem);

  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to feedback file:', err);
  }

  return newItem;
}

/**
 * Updates the completed status of an existing item.
 */
export function updateFeedbackStatus(id, completed) {
  ensureDataDir();
  const items = getAllFeedback();
  const item = items.find((f) => f.id === id);
  if (!item) return null;

  item.completed = Boolean(completed);
  item.completedAt = item.completed ? new Date().toISOString() : null;

  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error updating feedback file:', err);
  }

  return item;
}
