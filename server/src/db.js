import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'devbrain.sqlite');
export const db = new DatabaseSync(dbPath);

// Initialize Universal Multi-User Tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      institution TEXT,
      role TEXT DEFAULT 'Learner',
      grade_or_level TEXT DEFAULT 'General',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      category TEXT DEFAULT 'General',
      icon TEXT DEFAULT 'BookOpen',
      color TEXT DEFAULT '#38bdf8',
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subject_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      tags TEXT DEFAULT '[]',
      difficulty TEXT DEFAULT 'Intermediate',
      status TEXT DEFAULT 'Draft',
      starred INTEGER DEFAULT 0,
      code_snippets TEXT DEFAULT '[]',
      resource_links TEXT DEFAULT '[]',
      flashcards TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS ai_chats (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      note_id TEXT,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (user_id, key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Ensure attachments and universal user columns exist if table was created earlier
  try {
    const noteCols = db.prepare("PRAGMA table_info(notes)").all();
    if (!noteCols.some(c => c.name === 'attachments')) {
      db.exec("ALTER TABLE notes ADD COLUMN attachments TEXT DEFAULT '[]'");
    }
    if (!noteCols.some(c => c.name === 'is_public')) {
      db.exec("ALTER TABLE notes ADD COLUMN is_public INTEGER DEFAULT 0");
    }
    if (!noteCols.some(c => c.name === 'share_id')) {
      db.exec("ALTER TABLE notes ADD COLUMN share_id TEXT");
    }
    if (!noteCols.some(c => c.name === 'pinned')) {
      db.exec("ALTER TABLE notes ADD COLUMN pinned INTEGER DEFAULT 0");
    }

    const userCols = db.prepare("PRAGMA table_info(users)").all();
    if (!userCols.some(c => c.name === 'institution')) {
      db.exec("ALTER TABLE users ADD COLUMN institution TEXT");
    }
    if (!userCols.some(c => c.name === 'role')) {
      db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Learner'");
    }
    const subCols = db.prepare("PRAGMA table_info(subjects)").all();
    if (!subCols.some(c => c.name === 'category')) {
      db.exec("ALTER TABLE subjects ADD COLUMN category TEXT DEFAULT 'General'");
    }
    if (!subCols.some(c => c.name === 'user_id')) {
      db.exec("ALTER TABLE subjects ADD COLUMN user_id TEXT");
    }
  } catch (e) {
    console.error('Column migration notice:', e.message);
  }
}
