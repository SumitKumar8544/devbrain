import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import crypto from 'node:crypto';
import { db, initDB, uploadsDir } from './db.js';
import { askAI, askGemini } from './ai.js';
import { uploadToSupabase } from './supabase.js';
import { initMongo, isMongoConnected, MongoUser } from './mongo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded photos, documents, and PDFs statically (local fallback)
app.use('/uploads', express.static(uploadsDir));

// Initialize DB schema & cloud databases
initDB();
initMongo();

// Multer Storage Configuration for Photos and Documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for high-res photos / PDFs
});

// Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_devbrain_salt').digest('hex');
}

// Authentication middleware
function getUserId(req) {
  return req.headers['x-user-id'] || req.query.userId || null;
}

async function requireAuth(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  let user = null;
  if (isMongoConnected()) {
    try {
      const doc = await MongoUser.findById(userId).lean();
      if (doc) {
        user = {
          id: doc._id,
          name: doc.name,
          email: doc.email,
          institution: doc.institution,
          role: doc.role,
          grade_or_level: doc.grade_or_level,
        };
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  if (!user) {
    user = db.prepare('SELECT id, name, email, institution, role, grade_or_level FROM users WHERE id = ?').get(userId);
  }

  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  req.user = user;
  next();
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DevBrain Vault API',
    database: isMongoConnected() ? 'MongoDB Atlas (Cloud)' : 'SQLite (Local)',
    storage: 'Supabase Storage (Cloud) + Local Disk Fallback',
    time: new Date().toISOString()
  });
});

// ==========================================
// 1. FILE UPLOAD (MULTIPLE PHOTOS, PDFS, DOCUMENTS)
// ==========================================
app.post('/api/upload', requireAuth, upload.array('files', 50), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = await Promise.all(
      files.map(async (file) => {
        const mime = file.mimetype || '';
        let fileType = 'document';
        const ext = path.extname(file.originalname).toLowerCase();

        if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'].includes(ext)) {
          fileType = 'image';
        } else if (mime === 'application/pdf' || ext === '.pdf') {
          fileType = 'pdf';
        }

        let fileUrl = `/uploads/${file.filename}`;
        let isCloud = false;

        // Upload buffer to Supabase Storage
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const cloudUpload = await uploadToSupabase(fileBuffer, file.originalname, mime);
          if (cloudUpload && cloudUpload.url) {
            fileUrl = cloudUpload.url;
            isCloud = true;
          }
        } catch (uploadErr) {
          console.warn('[Upload] Supabase cloud upload fallback to local disk:', uploadErr.message);
        }

        return {
          id: `att-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          name: file.originalname,
          url: fileUrl,
          isCloud,
          type: fileType,
          size: file.size,
          mimeType: mime,
          uploaded_at: new Date().toISOString(),
        };
      })
    );

    res.json({
      success: true,
      attachments,
      attachment: attachments[0] // backward compatibility
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. AUTHENTICATION (UNIVERSAL FOR EVERYONE)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, institution, role, grade_or_level } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Check in MongoDB Atlas or SQLite
    let existing = null;
    if (isMongoConnected()) {
      try {
        existing = await MongoUser.findOne({ email: cleanEmail }).lean();
      } catch (e) {}
    }
    if (!existing) {
      existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    }

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = hashPassword(password);

    // Save to local SQLite
    db.prepare(`
      INSERT INTO users (id, name, email, password, institution, role, grade_or_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name.trim(),
      cleanEmail,
      passwordHash,
      institution ? institution.trim() : '',
      role ? role.trim() : 'Learner',
      grade_or_level ? grade_or_level.trim() : 'General'
    );

    // Save to MongoDB Atlas
    if (isMongoConnected()) {
      try {
        await MongoUser.create({
          _id: userId,
          name: name.trim(),
          email: cleanEmail,
          password: passwordHash,
          institution: institution ? institution.trim() : '',
          role: role ? role.trim() : 'Learner',
          grade_or_level: grade_or_level ? grade_or_level.trim() : 'General',
        });
      } catch (mongoErr) {
        console.warn('[Auth] MongoUser create warning:', mongoErr.message);
      }
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      institution: institution ? institution.trim() : '',
      role: role ? role.trim() : 'Learner',
      grade_or_level: grade_or_level ? grade_or_level.trim() : 'General',
      created_at: new Date().toISOString()
    };

    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    let user = null;

    // Check MongoDB Atlas first if connected
    if (isMongoConnected()) {
      try {
        const mongoUser = await MongoUser.findOne({ email: cleanEmail, password: passwordHash }).lean();
        if (mongoUser) {
          user = {
            id: mongoUser._id,
            name: mongoUser.name,
            email: mongoUser.email,
            institution: mongoUser.institution,
            role: mongoUser.role,
            grade_or_level: mongoUser.grade_or_level,
            created_at: mongoUser.created_at,
          };
          // Sync into local SQLite for fast relational joins
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, password, institution, role, grade_or_level)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              user.id,
              user.name,
              user.email,
              passwordHash,
              user.institution,
              user.role,
              user.grade_or_level
            );
          } catch (syncErr) {}
        }
      } catch (mongoErr) {
        console.warn('[Auth] MongoDB login query error:', mongoErr.message);
      }
    }

    // Fallback to SQLite
    if (!user) {
      user = db.prepare(`
        SELECT id, name, email, institution, role, grade_or_level, created_at
        FROM users
        WHERE email = ? AND password = ?
      `).get(cleanEmail, passwordHash);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, institution, role, grade_or_level } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    // Update in SQLite
    db.prepare(`
      UPDATE users
      SET name = ?, institution = ?, role = ?, grade_or_level = ?
      WHERE id = ?
    `).run(
      name.trim(),
      institution ? institution.trim() : '',
      role ? role.trim() : 'Learner',
      grade_or_level ? grade_or_level.trim() : 'General',
      req.user.id
    );

    // Update in MongoDB Atlas
    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, {
          name: name.trim(),
          institution: institution ? institution.trim() : '',
          role: role ? role.trim() : 'Learner',
          grade_or_level: grade_or_level ? grade_or_level.trim() : 'General',
        });
      } catch (e) {}
    }

    const updatedUser = {
      ...req.user,
      name: name.trim(),
      institution: institution ? institution.trim() : '',
      role: role ? role.trim() : 'Learner',
      grade_or_level: grade_or_level ? grade_or_level.trim() : 'General',
    };
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const currentHash = hashPassword(currentPassword);
    
    // Verify password in MongoDB or SQLite
    let valid = false;
    if (isMongoConnected()) {
      try {
        const u = await MongoUser.findById(req.user.id).lean();
        if (u && u.password === currentHash) valid = true;
      } catch (e) {}
    }
    if (!valid) {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND password = ?').get(req.user.id, currentHash);
      if (u) valid = true;
    }

    if (!valid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, req.user.id);

    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, { password: newHash });
      } catch (e) {}
    }

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. STATS & CATEGORIES
// ==========================================
app.get('/api/stats', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;

    const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(userId).count;
    const totalSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE user_id = ?').get(userId).count;
    const starredNotes = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND starred = 1').get(userId).count;
    const masteredNotes = db.prepare("SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND status = 'Mastered'").get(userId).count;
    const interviewReady = db.prepare("SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND status = 'Interview Ready'").get(userId).count;

    const subjectsWithCount = db.prepare(`
      SELECT s.*, COUNT(n.id) as note_count
      FROM subjects s
      LEFT JOIN notes n ON s.id = n.subject_id AND n.user_id = ?
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all(userId, userId);

    res.json({
      totalNotes,
      totalSubjects,
      starredNotes,
      masteredNotes,
      interviewReady,
      subjects: subjectsWithCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. CATEGORIES / NOTEBOOKS
// ==========================================
app.get('/api/subjects', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const subjects = db.prepare(`
      SELECT s.*, COUNT(n.id) as note_count
      FROM subjects s
      LEFT JOIN notes n ON s.id = n.subject_id AND n.user_id = ?
      WHERE s.user_id = ?
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all(userId, userId);
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subjects', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { name, code, category, icon, color, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = `sub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
    const stmt = db.prepare(`
      INSERT INTO subjects (id, user_id, name, code, category, icon, color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, name.trim(), code || '', category || 'General', icon || 'BookOpen', color || '#38bdf8', description || '');

    const newSub = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    res.status(201).json(newSub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subjects/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, category, icon, color, description } = req.body;
    db.prepare(`
      UPDATE subjects
      SET name = ?, code = ?, category = ?, icon = ?, color = ?, description = ?
      WHERE id = ? AND user_id = ?
    `).run(name, code, category, icon, color, description, id, req.user.id);

    const updated = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subjects/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    // Set notes that had this subject_id to NULL so notes are never lost
    db.prepare('UPDATE notes SET subject_id = NULL WHERE subject_id = ? AND user_id = ?').run(id, req.user.id);
    db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true, message: 'Notebook category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. NOTES (WITH PHOTOS, PDFS, LINKS, CODE)
// ==========================================
app.get('/api/notes', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { subject_id, search, difficulty, status, starred, tag } = req.query;

    let query = `
      SELECT n.*, s.name as subject_name, s.color as subject_color, s.code as subject_code
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.user_id = ?
    `;
    const params = [userId];

    if (subject_id) {
      query += ` AND n.subject_id = ?`;
      params.push(subject_id);
    }
    if (difficulty) {
      query += ` AND n.difficulty = ?`;
      params.push(difficulty);
    }
    if (status) {
      query += ` AND n.status = ?`;
      params.push(status);
    }
    if (starred === '1' || starred === 'true') {
      query += ` AND n.starred = 1`;
    }
    if (search) {
      query += ` AND (n.title LIKE ? OR n.content LIKE ? OR n.summary LIKE ? OR n.tags LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
    if (tag) {
      query += ` AND n.tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    query += ` ORDER BY n.pinned DESC, n.starred DESC, n.updated_at DESC`;

    const notes = db.prepare(query).all(...params);

    const formattedNotes = notes.map(note => ({
      ...note,
      tags: safeJsonParse(note.tags, []),
      code_snippets: safeJsonParse(note.code_snippets, []),
      resource_links: safeJsonParse(note.resource_links, []),
      flashcards: safeJsonParse(note.flashcards, []),
      attachments: safeJsonParse(note.attachments, [])
    }));

    res.json(formattedNotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare(`
      SELECT n.*, s.name as subject_name, s.color as subject_color, s.code as subject_code
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      WHERE n.id = ? AND n.user_id = ?
    `).get(id, req.user.id);

    if (!note) return res.status(404).json({ error: 'Note not found' });

    res.json({
      ...note,
      tags: safeJsonParse(note.tags, []),
      code_snippets: safeJsonParse(note.code_snippets, []),
      resource_links: safeJsonParse(note.resource_links, []),
      flashcards: safeJsonParse(note.flashcards, []),
      attachments: safeJsonParse(note.attachments, [])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject_id,
      title,
      content,
      summary,
      tags,
      difficulty,
      status,
      starred,
      code_snippets,
      resource_links,
      flashcards,
      attachments
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const id = `note-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO notes (
        id, user_id, subject_id, title, content, summary, tags, difficulty, status, starred,
        code_snippets, resource_links, flashcards, attachments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userId,
      subject_id || null,
      title.trim(),
      content || '',
      summary || '',
      JSON.stringify(tags || []),
      difficulty || 'Intermediate',
      status || 'Draft',
      starred ? 1 : 0,
      JSON.stringify(code_snippets || []),
      JSON.stringify(resource_links || []),
      JSON.stringify(flashcards || []),
      JSON.stringify(attachments || []),
      now,
      now
    );

    const createdNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.status(201).json({
      ...createdNote,
      tags: safeJsonParse(createdNote.tags, []),
      code_snippets: safeJsonParse(createdNote.code_snippets, []),
      resource_links: safeJsonParse(createdNote.resource_links, []),
      flashcards: safeJsonParse(createdNote.flashcards, []),
      attachments: safeJsonParse(createdNote.attachments, [])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const {
      subject_id,
      title,
      content,
      summary,
      tags,
      difficulty,
      status,
      starred,
      code_snippets,
      resource_links,
      flashcards,
      attachments
    } = req.body;

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE notes
      SET subject_id = ?,
          title = ?,
          content = ?,
          summary = ?,
          tags = ?,
          difficulty = ?,
          status = ?,
          starred = ?,
          code_snippets = ?,
          resource_links = ?,
          flashcards = ?,
          attachments = ?,
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      subject_id || null,
      title.trim(),
      content,
      summary,
      JSON.stringify(tags || []),
      difficulty,
      status,
      starred ? 1 : 0,
      JSON.stringify(code_snippets || []),
      JSON.stringify(resource_links || []),
      JSON.stringify(flashcards || []),
      JSON.stringify(attachments || []),
      now,
      id,
      req.user.id
    );

    const updatedNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    res.json({
      ...updatedNote,
      tags: safeJsonParse(updatedNote.tags, []),
      code_snippets: safeJsonParse(updatedNote.code_snippets, []),
      resource_links: safeJsonParse(updatedNote.resource_links, []),
      flashcards: safeJsonParse(updatedNote.flashcards, []),
      attachments: safeJsonParse(updatedNote.attachments, [])
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, req.user.id);
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes/:id/toggle-star', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT starred FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const newStar = note.starred === 1 ? 0 : 1;
    db.prepare('UPDATE notes SET starred = ? WHERE id = ? AND user_id = ?').run(newStar, id, req.user.id);
    res.json({ success: true, starred: newStar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes/:id/toggle-pin', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT pinned FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const newPinned = note.pinned === 1 ? 0 : 1;
    db.prepare('UPDATE notes SET pinned = ? WHERE id = ? AND user_id = ?').run(newPinned, id, req.user.id);
    res.json({ success: true, pinned: newPinned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes/:id/toggle-share', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const note = db.prepare('SELECT id, is_public, share_id FROM notes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    let shareId = note.share_id;
    if (!shareId) {
      shareId = `sh-${crypto.randomBytes(6).toString('hex')}`;
    }

    const newPublic = note.is_public === 1 ? 0 : 1;
    db.prepare('UPDATE notes SET is_public = ?, share_id = ? WHERE id = ? AND user_id = ?').run(newPublic, shareId, id, req.user.id);

    res.json({
      success: true,
      is_public: newPublic,
      share_id: shareId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PUBLIC NOTE SHAREABLE VIEW (NO AUTH REQUIRED)
// ==========================================
app.get('/api/public/notes/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;
    const note = db.prepare(`
      SELECT n.*, s.name as subject_name, s.color as subject_color, s.code as subject_code, u.name as author_name
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.id
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.share_id = ? AND n.is_public = 1
    `).get(shareId);

    if (!note) {
      return res.status(404).json({ error: 'This shared note is private or has been removed.' });
    }

    res.json({
      ...note,
      tags: safeJsonParse(note.tags, []),
      code_snippets: safeJsonParse(note.code_snippets, []),
      resource_links: safeJsonParse(note.resource_links, []),
      flashcards: safeJsonParse(note.flashcards, []),
      attachments: safeJsonParse(note.attachments, []),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. AI STUDY & UNDERSTANDING CHAT
// ==========================================
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  try {
    const { message, noteId, history, action, provider, model } = req.body;

    const keySetting = db.prepare('SELECT value FROM settings WHERE user_id = ? AND key = ?').get(req.user.id, 'gemini_api_key');
    const apiKey = keySetting ? keySetting.value : '';

    let note = null;
    if (noteId) {
      note = db.prepare(`
        SELECT n.*, s.name as subject_name
        FROM notes n
        LEFT JOIN subjects s ON n.subject_id = s.id
        WHERE n.id = ? AND n.user_id = ?
      `).get(noteId, req.user.id);
    }

    const aiResponse = await askAI({
      message,
      note,
      history,
      apiKey,
      action,
      provider,
      model
    });

    res.json(aiResponse);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. SETTINGS & EXPORT / IMPORT
// ==========================================
app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings WHERE user_id = ?').all(req.user.id);
    const settings = {
      gemini_api_key: process.env.GEMINI_API_KEY || ''
    };
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key required' });

    db.prepare(`
      INSERT INTO settings (user_id, key, value)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value
    `).run(req.user.id, key, value);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const subjects = db.prepare('SELECT * FROM subjects WHERE user_id = ?').all(userId);
    const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(userId).map(n => ({
      ...n,
      tags: safeJsonParse(n.tags, []),
      code_snippets: safeJsonParse(n.code_snippets, []),
      resource_links: safeJsonParse(n.resource_links, []),
      flashcards: safeJsonParse(n.flashcards, []),
      attachments: safeJsonParse(n.attachments, [])
    }));

    const backupPayload = {
      version: '3.0',
      exported_at: new Date().toISOString(),
      user: req.user,
      subjects,
      notes
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=devbrain-vault-${req.user.name.replace(/\s+/g, '_')}-${Date.now()}.json`);
    res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/import', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const { subjects, notes } = req.body;
    if (!Array.isArray(subjects) || !Array.isArray(notes)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    const insertSub = db.prepare(`
      INSERT INTO subjects (id, user_id, name, code, category, icon, color, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, code=excluded.code, category=excluded.category,
        icon=excluded.icon, color=excluded.color, description=excluded.description
    `);

    for (const s of subjects) {
      insertSub.run(s.id, userId, s.name, s.code || '', s.category || 'General', s.icon, s.color, s.description);
    }

    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, user_id, subject_id, title, content, summary, tags, difficulty, status, starred,
        code_snippets, resource_links, flashcards, attachments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        subject_id=excluded.subject_id, title=excluded.title, content=excluded.content,
        summary=excluded.summary, tags=excluded.tags, difficulty=excluded.difficulty,
        status=excluded.status, starred=excluded.starred, code_snippets=excluded.code_snippets,
        resource_links=excluded.resource_links, flashcards=excluded.flashcards,
        attachments=excluded.attachments, updated_at=excluded.updated_at
    `);

    for (const n of notes) {
      insertNote.run(
        n.id,
        userId,
        n.subject_id,
        n.title,
        n.content,
        n.summary,
        typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || []),
        n.difficulty,
        n.status,
        n.starred ? 1 : 0,
        typeof n.code_snippets === 'string' ? n.code_snippets : JSON.stringify(n.code_snippets || []),
        typeof n.resource_links === 'string' ? n.resource_links : JSON.stringify(n.resource_links || []),
        typeof n.flashcards === 'string' ? n.flashcards : JSON.stringify(n.flashcards || []),
        typeof n.attachments === 'string' ? n.attachments : JSON.stringify(n.attachments || []),
        n.created_at || new Date().toISOString(),
        n.updated_at || new Date().toISOString()
      );
    }

    res.json({ success: true, importedSubjects: subjects.length, importedNotes: notes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Serve built React frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`🧠 DevBrain Universal Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} busy, retrying in 1s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('Server error:', err);
  }
});
