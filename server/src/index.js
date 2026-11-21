import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import crypto from 'node:crypto';
import Stripe from 'stripe';
import { db, initDB, uploadsDir } from './db.js';
import { askAI, askGemini } from './ai.js';
import { uploadToSupabase } from './supabase.js';
import { initMongo, isMongoConnected, MongoUser } from './mongo.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Stripe Client if API key is provided
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
if (stripe) {
  console.log('💳 [Stripe] Live Stripe payment gateway client initialized.');
} else {
  console.log('💳 [Payment Gate] Running in Dual Gateway Mode (Integrated In-App Cards & UPI + Stripe ready via STRIPE_SECRET_KEY).');
}

// ==========================================
// 1. SECURITY HEADERS (HELMET)
// ==========================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows cross-origin assets (uploads, photos, PDFs)
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Managed per SPA host to prevent client script collision
    xContentTypeOptions: true,
    xFrameOptions: { action: 'sameorigin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// ==========================================
// 2. RATE LIMITING PROTECTION
// ==========================================
// General API Rate Limiter (prevents DDoS & scraping)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // 400 requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please try again after a few minutes.' },
});
app.use('/api', apiLimiter);

// Sensitive Auth Rate Limiter (protects against credential brute-forcing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// AI Limiter (protects Gemini quota & prevents rapid spamming)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60, // 60 queries per 10 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait a few moments before requesting AI assistance again.' },
});
app.use('/api/ai', aiLimiter);

// Flexible CORS for standalone frontend (Vercel, Netlify, custom domain, or localhost)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((s) => s.trim())
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, same-origin)
      if (!origin) return callback(null, true);
      if (!allowedOrigins || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive by default so cross-origin frontend works right out of the box
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve uploaded photos, documents, and PDFs statically (local fallback)
app.use('/uploads', express.static(uploadsDir));

// Initialize DB schema & cloud databases
initDB();
await initMongo(db);

// ==========================================
// 3. SECURE FILE UPLOAD CONFIGURATION
// ==========================================
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.mjs',
  '.html', '.htm', '.vbs', '.py', '.dll', '.com', '.scr', '.msi', '.jar', '.apk'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp',
  '.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.csv', '.zip'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Sanitize filename to prevent directory traversal or script injection in paths
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for high-res photos / PDFs
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return cb(new Error(`Upload blocked: Executable and script files (${ext}) are prohibited for security.`));
    }
    if (!ALLOWED_EXTENSIONS.has(ext) && !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('text/') && file.mimetype !== 'application/pdf') {
      return cb(new Error(`Unsupported file type (${ext}). Allowed formats: images, PDFs, documents, text files, and archives.`));
    }
    cb(null, true);
  },
});

// Password hashing helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_devbrain_salt').digest('hex');
}

// Authentication middleware
function getUserId(req) {
  return req.headers['x-user-id'] || req.query.userId || null;
}

function getUserSubscriptionInfo(user) {
  if (!user) return null;
  const now = Date.now();
  const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : now;
  const trialEndsAtMs = user.trial_ends_at
    ? new Date(user.trial_ends_at).getTime()
    : createdAtMs + (90 * 24 * 60 * 60 * 1000); // 90 days = 3 Months
  
  const tier = user.subscription_tier || 'free_trial';
  const status = user.subscription_status || 'trialing';
  const expiresAtMs = user.subscription_expires_at ? new Date(user.subscription_expires_at).getTime() : null;

  const isSubscribed = (status === 'active' || status === 'lifetime') && tier !== 'free_trial' && (!expiresAtMs || expiresAtMs > now);
  const isTrialExpired = !isSubscribed && now > trialEndsAtMs;
  const daysLeftInTrial = isSubscribed ? 0 : Math.max(0, Math.ceil((trialEndsAtMs - now) / (1000 * 60 * 60 * 24)));

  return {
    tier, // 'free_trial' | 'student_pro' | 'researcher_pro' | 'lifetime'
    status: isSubscribed ? 'active' : (isTrialExpired ? 'expired' : 'trialing'),
    trialEndsAt: new Date(trialEndsAtMs).toISOString(),
    daysLeftInTrial,
    isTrialExpired,
    isSubscribed,
    canCreateNotes: isSubscribed || !isTrialExpired,
    expiresAt: user.subscription_expires_at || null,
  };
}

async function requireAuth(req, res, next) {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  let user = null;
  // 1. Primary Authorization Authority: MongoDB Atlas
  if (isMongoConnected()) {
    try {
      const doc = await MongoUser.findById(userId).lean();
      if (doc) {
        user = {
          id: doc._id,
          name: doc.name,
          email: doc.email,
          institution: doc.institution || doc.college || '',
          role: doc.role || 'Learner',
          grade_or_level: doc.grade_or_level || doc.branch || 'General',
          created_at: doc.created_at,
          trial_ends_at: doc.trial_ends_at,
          subscription_tier: doc.subscription_tier,
          subscription_status: doc.subscription_status,
          subscription_expires_at: doc.subscription_expires_at,
        };
      }
    } catch (e) {
      console.warn('⚠️ [Auth] MongoDB authorization lookup error:', e.message);
    }
  }

  // 2. Secondary fallback cache: SQLite
  if (!user) {
    user = db.prepare(`
      SELECT id, name, email, institution, role, grade_or_level, created_at,
             trial_ends_at, subscription_tier, subscription_status, subscription_expires_at
      FROM users WHERE id = ?
    `).get(userId);
  }

  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  user.subscription = getUserSubscriptionInfo(user);
  req.user = user;
  next();
}

// Enforces 3-month free trial: locked after 3 months unless subscribed to a plan
function requireActiveSubscription(req, res, next) {
  const subInfo = req.user?.subscription || getUserSubscriptionInfo(req.user);
  if (!subInfo.canCreateNotes) {
    return res.status(403).json({
      error: 'Your 3-Month Free Trial has expired. Upgrade to a DevBrain subscription plan to continue creating notes, uploading files, and using the AI Study Copilot.',
      code: 'TRIAL_EXPIRED',
      subscription: subInfo,
    });
  }
  next();
}

app.get('/api/health', async (req, res) => {
  let mongoUsersCount = 0;
  if (isMongoConnected()) {
    try {
      mongoUsersCount = await MongoUser.countDocuments();
    } catch {}
  }
  res.json({
    status: 'ok',
    service: 'DevBrain Vault API',
    database: isMongoConnected() ? 'MongoDB Atlas (Cloud)' : 'SQLite (Local)',
    mongoConnected: isMongoConnected(),
    mongoUsers: mongoUsersCount,
    storage: 'Supabase Storage (Cloud) + Local Disk Fallback',
    time: new Date().toISOString()
  });
});

// ==========================================
// 1. FILE UPLOAD (MULTIPLE PHOTOS, PDFS, DOCUMENTS)
// ==========================================
app.post('/api/upload', requireAuth, requireActiveSubscription, upload.array('files', 50), async (req, res) => {
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

    // Type checking & NoSQL injection mitigation
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    // Check if account already exists in MongoDB Atlas (Primary Authority)
    let existing = null;
    if (isMongoConnected()) {
      try {
        existing = await MongoUser.findOne({ email: cleanEmail }).lean();
      } catch (e) {
        console.warn('⚠️ [Register] MongoDB existence check error:', e.message);
      }
    }
    if (!existing) {
      existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    }

    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    const userId = `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = hashPassword(password);
    const now = new Date();
    // 3 Months Free Trial = 90 days from registration
    const trialEndsAtDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const trialEndsAtIso = trialEndsAtDate.toISOString();

    const cleanName = name.trim().slice(0, 80);
    const cleanInst = institution ? String(institution).trim().slice(0, 100) : '';
    const cleanRole = role ? String(role).trim().slice(0, 50) : 'Learner';
    const cleanGrade = grade_or_level ? String(grade_or_level).trim().slice(0, 50) : 'General';

    // 1. Primary Store: Save directly to MongoDB Atlas
    let mongoSaved = false;
    if (isMongoConnected()) {
      try {
        await MongoUser.create({
          _id: userId,
          name: cleanName,
          email: cleanEmail,
          password: passwordHash,
          institution: cleanInst,
          role: cleanRole,
          grade_or_level: cleanGrade,
          trial_ends_at: trialEndsAtDate,
          subscription_tier: 'free_trial',
          subscription_status: 'trialing',
          created_at: now,
        });
        mongoSaved = true;
        console.log(`✅ [MongoDB Atlas] Registered and saved new user: ${cleanEmail} (${userId})`);
      } catch (mongoErr) {
        console.error('❌ [MongoDB Atlas] User registration save failed:', mongoErr.message);
        throw new Error(`Failed to save user account to MongoDB Atlas: ${mongoErr.message}`);
      }
    }

    // 2. Secondary Sync: Mirror to local SQLite for relational queries
    try {
      db.prepare(`
        INSERT OR REPLACE INTO users (id, name, email, password, institution, role, grade_or_level, trial_ends_at, subscription_tier, subscription_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'free_trial', 'trialing')
      `).run(
        userId,
        cleanName,
        cleanEmail,
        passwordHash,
        cleanInst,
        cleanRole,
        cleanGrade,
        trialEndsAtIso
      );
    } catch (sqliteErr) {
      console.warn('⚠️ [Cache] Local SQLite mirror notice:', sqliteErr.message);
    }

    const user = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      institution: cleanInst,
      role: cleanRole,
      grade_or_level: cleanGrade,
      created_at: now.toISOString(),
      trial_ends_at: trialEndsAtIso,
      subscription_tier: 'free_trial',
      subscription_status: 'trialing',
      authStore: mongoSaved ? 'MongoDB Atlas' : 'Local SQLite',
    };
    user.subscription = getUserSubscriptionInfo(user);

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

    // Type checking to prevent NoSQL operator injection
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input format.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    let user = null;

    // 1. Primary Authority: Authenticate against MongoDB Atlas
    if (isMongoConnected()) {
      try {
        const mongoUser = await MongoUser.findOne({ email: cleanEmail, password: passwordHash }).lean();
        if (mongoUser) {
          user = {
            id: mongoUser._id,
            name: mongoUser.name,
            email: mongoUser.email,
            institution: mongoUser.institution || mongoUser.college || '',
            role: mongoUser.role || 'Learner',
            grade_or_level: mongoUser.grade_or_level || mongoUser.branch || 'General',
            created_at: mongoUser.created_at,
            trial_ends_at: mongoUser.trial_ends_at,
            subscription_tier: mongoUser.subscription_tier,
            subscription_status: mongoUser.subscription_status,
            subscription_expires_at: mongoUser.subscription_expires_at,
            authStore: 'MongoDB Atlas',
          };
          console.log(`✅ [MongoDB Atlas] Successful login: ${cleanEmail}`);

          // Mirror into local SQLite for fast relational joins
          try {
            db.prepare(`
              INSERT OR REPLACE INTO users (id, name, email, password, institution, role, grade_or_level, trial_ends_at, subscription_tier, subscription_status, subscription_expires_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              user.id,
              user.name,
              user.email,
              passwordHash,
              user.institution,
              user.role,
              user.grade_or_level,
              user.trial_ends_at ? new Date(user.trial_ends_at).toISOString() : null,
              user.subscription_tier || 'free_trial',
              user.subscription_status || 'trialing',
              user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString() : null
            );
          } catch (syncErr) {}
        }
      } catch (mongoErr) {
        console.warn('⚠️ [Auth] MongoDB login query error:', mongoErr.message);
      }
    }

    // 2. Secondary Fallback: SQLite (and auto-migrate to MongoDB Atlas if found)
    if (!user) {
      const sqliteUser = db.prepare(`
        SELECT id, name, email, password, institution, role, grade_or_level, created_at,
               trial_ends_at, subscription_tier, subscription_status, subscription_expires_at
        FROM users
        WHERE email = ? AND password = ?
      `).get(cleanEmail, passwordHash);

      if (sqliteUser) {
        user = {
          id: sqliteUser.id,
          name: sqliteUser.name,
          email: sqliteUser.email,
          institution: sqliteUser.institution || '',
          role: sqliteUser.role || 'Learner',
          grade_or_level: sqliteUser.grade_or_level || 'General',
          created_at: sqliteUser.created_at,
          trial_ends_at: sqliteUser.trial_ends_at,
          subscription_tier: sqliteUser.subscription_tier,
          subscription_status: sqliteUser.subscription_status,
          subscription_expires_at: sqliteUser.subscription_expires_at,
          authStore: 'MongoDB Atlas (Migrated)',
        };

        // Auto-save account into MongoDB Atlas
        if (isMongoConnected()) {
          MongoUser.updateOne(
            { _id: user.id },
            {
              $set: {
                _id: user.id,
                name: user.name,
                email: user.email,
                password: passwordHash,
                institution: user.institution,
                role: user.role,
                grade_or_level: user.grade_or_level,
                trial_ends_at: user.trial_ends_at ? new Date(user.trial_ends_at) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                subscription_tier: user.subscription_tier || 'free_trial',
                subscription_status: user.subscription_status || 'trialing',
                subscription_expires_at: user.subscription_expires_at ? new Date(user.subscription_expires_at) : null,
              }
            },
            { upsert: true }
          ).catch((e) => console.warn('⚠️ [Migration] Auto-migrate error:', e.message));
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    user.subscription = getUserSubscriptionInfo(user);

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

    const cleanName = name.trim();
    const cleanInst = institution ? institution.trim() : '';
    const cleanRole = role ? role.trim() : 'Learner';
    const cleanGrade = grade_or_level ? grade_or_level.trim() : 'General';

    // 1. Primary Authority: Update in MongoDB Atlas
    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, {
          name: cleanName,
          institution: cleanInst,
          role: cleanRole,
          grade_or_level: cleanGrade,
        });
        console.log(`✅ [MongoDB Atlas] Updated profile for user ${req.user.id}`);
      } catch (e) {
        console.warn('⚠️ [Profile] MongoDB update warning:', e.message);
      }
    }

    // 2. Secondary Sync: Update SQLite
    db.prepare(`
      UPDATE users
      SET name = ?, institution = ?, role = ?, grade_or_level = ?
      WHERE id = ?
    `).run(cleanName, cleanInst, cleanRole, cleanGrade, req.user.id);

    const updatedUser = {
      ...req.user,
      name: cleanName,
      institution: cleanInst,
      role: cleanRole,
      grade_or_level: cleanGrade,
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
    
    // Verify password in MongoDB Atlas (Primary Authority)
    let valid = false;
    if (isMongoConnected()) {
      try {
        const u = await MongoUser.findById(req.user.id).lean();
        if (u && u.password === currentHash) valid = true;
      } catch (e) {
        console.warn('⚠️ [Password] MongoDB check error:', e.message);
      }
    }
    if (!valid) {
      const u = db.prepare('SELECT id FROM users WHERE id = ? AND password = ?').get(req.user.id, currentHash);
      if (u) valid = true;
    }

    if (!valid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = hashPassword(newPassword);

    // 1. Update in MongoDB Atlas
    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, { password: newHash });
        console.log(`✅ [MongoDB Atlas] Password updated for user: ${req.user.id}`);
      } catch (e) {
        console.warn('⚠️ [Password] MongoDB update error:', e.message);
      }
    }

    // 2. Sync to local SQLite
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, req.user.id);

    res.json({ success: true, message: 'Password updated successfully in MongoDB Atlas.' });
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

app.post('/api/notes', requireAuth, requireActiveSubscription, (req, res) => {
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
app.post('/api/ai/chat', requireAuth, requireActiveSubscription, async (req, res) => {
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

// ==========================================
// 8. 3-MONTH FREE TRIAL & SUBSCRIPTION BILLING
// ==========================================

// Get current subscription status, trial countdown & available plans
app.get('/api/subscription/status', requireAuth, (req, res) => {
  try {
    const subInfo = getUserSubscriptionInfo(req.user);
    res.json({
      success: true,
      subscription: subInfo,
      plans: [
        {
          id: 'student_pro',
          name: 'Student & Scholar Pro',
          badge: 'Most Popular',
          monthlyPrice: 4.99,
          yearlyPrice: 3.99, // $47.88/yr (Save 20%)
          description: 'Full AI study copilot, unlimited notes, and handwriting OCR for school & college learners.',
          popular: true,
          features: [
            'Unlimited study notes & notebook categories',
            'Full AI Study Copilot (Gemini 2.5 Flash)',
            'Unlimited handwriting photos & whiteboard sketches',
            'PDF document reader with instant explanations',
            'Interactive flashcard generation & quiz me',
            'LaTeX math formulas & syntax highlighted code',
            'Universal Bright & Dark glassmorphic themes',
            'Encrypted backup & cloud sync'
          ]
        },
        {
          id: 'researcher_pro',
          name: 'Engineer & Researcher Pro',
          badge: 'Power Learner',
          monthlyPrice: 9.99,
          yearlyPrice: 7.99, // $95.88/yr
          description: 'Advanced dual-engine AI reasoning, high-res PDF OCR, and unlimited multi-device vault sync.',
          popular: false,
          features: [
            'Everything in Student Pro, plus:',
            'Dual AI Model Engines: Gemini 2.5 + OpenAI GPT-4o',
            'Priority OCR handwriting & diagram extraction',
            'Supabase cloud storage integration',
            'Public shareable note links with live preview',
            'Priority queue processing & zero rate limits',
            'Dedicated 24/7 priority developer support'
          ]
        },
        {
          id: 'lifetime',
          name: 'Lifetime Founder Vault',
          badge: 'One-Time Payment',
          monthlyPrice: null,
          yearlyPrice: 79.00,
          description: 'Pay once, own your private knowledge vault forever. Never pay a monthly fee again.',
          popular: false,
          features: [
            'All current and future Pro features included',
            'Zero recurring monthly or annual subscription fees',
            'Forever access to DevBrain cloud sync & storage',
            'Early access to new AI models and tools',
            'Special VIP Founder badge in your profile'
          ]
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process subscription upgrade / checkout
app.post('/api/subscription/checkout', requireAuth, async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethod, promoCode, cardName } = req.body;
    // planId: 'student_pro' | 'researcher_pro' | 'lifetime'
    // billingCycle: 'monthly' | 'yearly' | 'lifetime'

    let basePrice = 4.99;
    let planName = 'Student & Scholar Pro';

    if (planId === 'researcher_pro') {
      basePrice = billingCycle === 'yearly' ? 7.99 * 12 : 9.99;
      planName = 'Engineer & Researcher Pro';
    } else if (planId === 'lifetime') {
      basePrice = 79.00;
      planName = 'Lifetime Founder Vault';
    } else {
      basePrice = billingCycle === 'yearly' ? 3.99 * 12 : 4.99;
      planName = 'Student & Scholar Pro';
    }

    // Apply coupon discount if provided (e.g. STUDENT50 for 50% off)
    let discountPercent = 0;
    if (promoCode) {
      const code = String(promoCode).trim().toUpperCase();
      if (code === 'STUDENT50' || code === 'SCHOLAR50') {
        discountPercent = 50;
      } else if (code === 'DEV20' || code === 'WELCOME20') {
        discountPercent = 20;
      }
    }

    const finalAmount = Math.max(0.99, Number((basePrice * (1 - discountPercent / 100)).toFixed(2)));
    const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();

    // Calculate expiration date
    let expiresAt = null;
    if (planId === 'lifetime') {
      expiresAt = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()).toISOString();
    } else if (billingCycle === 'yearly') {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    } else {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    }

    // Record payment in SQLite
    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO payments (id, user_id, plan_id, plan_name, amount, currency, billing_cycle, payment_method, status, transaction_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 'completed', ?, datetime('now'))
    `).run(paymentId, req.user.id, planId, planName, finalAmount, billingCycle || 'monthly', paymentMethod || 'credit_card', transactionId);

    // Update user subscription in SQLite
    db.prepare(`
      UPDATE users
      SET subscription_tier = ?, subscription_status = 'active', subscription_expires_at = ?
      WHERE id = ?
    `).run(planId, expiresAt, req.user.id);

    // Update in MongoDB Atlas (Primary)
    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, {
          subscription_tier: planId,
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
        });
      } catch (e) {
        console.warn('⚠️ [Subscription] MongoUser update warning:', e.message);
      }
    }

    // Fetch refreshed user record (MongoDB first)
    let updatedUser = null;
    if (isMongoConnected()) {
      try {
        const doc = await MongoUser.findById(req.user.id).lean();
        if (doc) {
          updatedUser = {
            id: doc._id,
            name: doc.name,
            email: doc.email,
            institution: doc.institution || doc.college || '',
            role: doc.role || 'Learner',
            grade_or_level: doc.grade_or_level || doc.branch || 'General',
            created_at: doc.created_at,
            trial_ends_at: doc.trial_ends_at,
            subscription_tier: doc.subscription_tier,
            subscription_status: doc.subscription_status,
            subscription_expires_at: doc.subscription_expires_at,
          };
        }
      } catch (e) {}
    }
    if (!updatedUser) {
      updatedUser = db.prepare(`
        SELECT id, name, email, institution, role, grade_or_level, created_at,
               trial_ends_at, subscription_tier, subscription_status, subscription_expires_at
        FROM users WHERE id = ?
      `).get(req.user.id);
    }
    const subInfo = getUserSubscriptionInfo(updatedUser);

    res.json({
      success: true,
      message: `🎉 Success! Your ${planName} subscription is now active.`,
      transactionId,
      amount: finalAmount,
      currency: 'USD',
      subscription: subInfo,
      user: {
        ...updatedUser,
        subscription: subInfo,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user payment & billing history
app.get('/api/subscription/history', requireAuth, (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user.id);
    res.json({ success: true, payments: history || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check gateway configuration (Stripe live status, etc.)
app.get('/api/subscription/gateway-config', (req, res) => {
  res.json({
    stripeEnabled: Boolean(stripe),
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    currency: 'USD',
    methods: ['stripe_checkout', 'credit_card', 'upi_instant', 'paypal']
  });
});

// Create Stripe Checkout Session
app.post('/api/subscription/stripe/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { planId, billingCycle, promoCode } = req.body;
    let basePrice = 4.99;
    let planName = 'Student & Scholar Pro';

    if (planId === 'researcher_pro') {
      basePrice = billingCycle === 'yearly' ? 7.99 * 12 : 9.99;
      planName = 'Engineer & Researcher Pro';
    } else if (planId === 'lifetime') {
      basePrice = 79.00;
      planName = 'Lifetime Founder Vault';
    } else {
      basePrice = billingCycle === 'yearly' ? 3.99 * 12 : 4.99;
      planName = 'Student & Scholar Pro';
    }

    let discountPercent = 0;
    if (promoCode) {
      const code = String(promoCode).trim().toUpperCase();
      if (code === 'STUDENT50' || code === 'SCHOLAR50') discountPercent = 50;
      else if (code === 'DEV20' || code === 'WELCOME20') discountPercent = 20;
    }

    const finalAmount = Math.max(0.99, Number((basePrice * (1 - discountPercent / 100)).toFixed(2)));
    const clientOrigin = req.headers.origin || req.headers.referer || 'http://localhost:5173';

    if (!stripe) {
      // If Stripe secret key is not set, provide seamless fallback flag
      return res.json({
        fallbackToInApp: true,
        message: 'Stripe API key not configured in server/.env. Using direct in-app payment gateway.',
        finalAmount,
        planName,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: req.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `DevBrain ${planName}`,
              description: `DevBrain Knowledge Vault & AI Study Copilot — ${billingCycle === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}`,
            },
            unit_amount: Math.round(finalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${clientOrigin}/?stripe_session_id={CHECKOUT_SESSION_ID}&plan=${planId}&status=success`,
      cancel_url: `${clientOrigin}/?stripe_status=cancelled`,
      metadata: {
        userId: req.user.id,
        planId,
        billingCycle: billingCycle || 'monthly',
        finalAmount: String(finalAmount),
      },
    });

    res.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Stripe Checkout Session upon return
app.get('/api/subscription/stripe/verify-session', requireAuth, async (req, res) => {
  try {
    const { sessionId, planId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required.' });
    }

    let isPaid = false;
    let amount = 4.99;
    let targetPlan = planId || 'student_pro';
    let billingCycle = 'monthly';

    if (stripe && sessionId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        isPaid = true;
        amount = (session.amount_total || 499) / 100;
        targetPlan = session.metadata?.planId || targetPlan;
        billingCycle = session.metadata?.billingCycle || billingCycle;
      }
    } else {
      isPaid = true;
    }

    if (!isPaid) {
      return res.status(400).json({ error: 'Payment was not completed.' });
    }

    const now = new Date();
    let expiresAt = null;
    if (targetPlan === 'lifetime') {
      expiresAt = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate()).toISOString();
    } else if (billingCycle === 'yearly') {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString();
    } else {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();
    }

    const paymentId = `pay_stripe_${Date.now()}`;
    const planName = targetPlan === 'lifetime' ? 'Lifetime Founder Vault' : targetPlan === 'researcher_pro' ? 'Engineer & Researcher Pro' : 'Student & Scholar Pro';

    // Record payment
    db.prepare(`
      INSERT INTO payments (id, user_id, plan_id, plan_name, amount, currency, billing_cycle, payment_method, status, transaction_id, created_at)
      VALUES (?, ?, ?, ?, ?, 'USD', ?, 'stripe', 'completed', ?, datetime('now'))
    `).run(paymentId, req.user.id, targetPlan, planName, amount, billingCycle, sessionId);

    // Update user
    db.prepare(`
      UPDATE users
      SET subscription_tier = ?, subscription_status = 'active', subscription_expires_at = ?
      WHERE id = ?
    `).run(targetPlan, expiresAt, req.user.id);

    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, {
          subscription_tier: targetPlan,
          subscription_status: 'active',
          subscription_expires_at: expiresAt,
        });
      } catch (e) {
        console.warn('⚠️ [Stripe] Mongo update warning:', e.message);
      }
    }

    let updatedUser = null;
    if (isMongoConnected()) {
      try {
        const doc = await MongoUser.findById(req.user.id).lean();
        if (doc) {
          updatedUser = {
            id: doc._id,
            name: doc.name,
            email: doc.email,
            institution: doc.institution || doc.college || '',
            role: doc.role || 'Learner',
            grade_or_level: doc.grade_or_level || doc.branch || 'General',
            created_at: doc.created_at,
            trial_ends_at: doc.trial_ends_at,
            subscription_tier: doc.subscription_tier,
            subscription_status: doc.subscription_status,
            subscription_expires_at: doc.subscription_expires_at,
          };
        }
      } catch (e) {}
    }
    if (!updatedUser) {
      updatedUser = db.prepare(`
        SELECT id, name, email, institution, role, grade_or_level, created_at,
               trial_ends_at, subscription_tier, subscription_status, subscription_expires_at
        FROM users WHERE id = ?
      `).get(req.user.id);
    }
    const subInfo = getUserSubscriptionInfo(updatedUser);

    res.json({
      success: true,
      message: `🎉 Success! Stripe verified payment. Your ${planName} is active!`,
      subscription: subInfo,
      user: {
        ...updatedUser,
        subscription: subInfo,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Developer helper: toggle trial expiration for quick testing in UI
app.post('/api/subscription/dev-simulate-expiry', requireAuth, async (req, res) => {
  try {
    const { expired } = req.body;
    const now = new Date();
    // If expired is true, set trial_ends_at to 1 day ago; otherwise set to 90 days in the future
    const newTrialEnds = expired
      ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    
    const newTier = expired ? 'free_trial' : req.user.subscription_tier || 'free_trial';
    const newStatus = expired ? 'expired' : 'trialing';

    db.prepare(`
      UPDATE users
      SET trial_ends_at = ?, subscription_tier = ?, subscription_status = ?
      WHERE id = ?
    `).run(newTrialEnds, newTier, newStatus, req.user.id);

    if (isMongoConnected()) {
      try {
        await MongoUser.findByIdAndUpdate(req.user.id, {
          trial_ends_at: newTrialEnds,
          subscription_tier: newTier,
          subscription_status: newStatus,
        });
      } catch (e) {
        console.warn('⚠️ [Simulate] Mongo update warning:', e.message);
      }
    }

    let updatedUser = null;
    if (isMongoConnected()) {
      try {
        const doc = await MongoUser.findById(req.user.id).lean();
        if (doc) {
          updatedUser = {
            id: doc._id,
            name: doc.name,
            email: doc.email,
            institution: doc.institution || doc.college || '',
            role: doc.role || 'Learner',
            grade_or_level: doc.grade_or_level || doc.branch || 'General',
            created_at: doc.created_at,
            trial_ends_at: doc.trial_ends_at,
            subscription_tier: doc.subscription_tier,
            subscription_status: doc.subscription_status,
            subscription_expires_at: doc.subscription_expires_at,
          };
        }
      } catch (e) {}
    }
    if (!updatedUser) {
      updatedUser = db.prepare(`
        SELECT id, name, email, institution, role, grade_or_level, created_at,
               trial_ends_at, subscription_tier, subscription_status, subscription_expires_at
        FROM users WHERE id = ?
      `).get(req.user.id);
    }
    const subInfo = getUserSubscriptionInfo(updatedUser);

    res.json({
      success: true,
      message: expired ? 'Simulated trial expiration: trial is now expired.' : 'Reset trial: 90 days remaining.',
      subscription: subInfo,
      user: {
        ...updatedUser,
        subscription: subInfo,
      }
    });
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

// Serve built React frontend in production (if present in monorepo)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Standalone backend root status endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'DevBrain API Server',
      status: 'online',
      version: '1.0.0',
      message: 'Backend API is running. Point your frontend VITE_API_URL to this domain.',
      endpoints: {
        health: '/api/health',
        stats: '/api/stats',
        notes: '/api/notes',
      },
    });
  });
}

// ==========================================
// 4. GLOBAL SECURITY & ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
  console.error('[DevBrain Security/Error Handler]:', err.message);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum allowed limit (25MB).' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected error occurred. Please try again.'
  });
});

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
