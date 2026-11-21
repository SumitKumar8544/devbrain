import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

// Resolve MongoDB Atlas SRV records reliably even if local ISP/Windows DNS refuses SRV queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

let isConnected = false;
let connectionPromise = null;

// User schema for MongoDB Atlas (Central Auth & User Identity)
const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // DevBrain user ID format: 'user-...'
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    institution: { type: String, default: '' },
    role: { type: String, default: 'Learner' },
    grade_or_level: { type: String, default: 'General' },
    college: { type: String, default: '' },
    branch: { type: String, default: '' },
    semester: { type: Number, default: 1 },
    trial_ends_at: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
    subscription_tier: { type: String, default: 'free_trial' }, // 'free_trial' | 'student_pro' | 'researcher_pro' | 'lifetime'
    subscription_status: { type: String, default: 'trialing' }, // 'trialing' | 'active' | 'expired' | 'cancelled'
    subscription_expires_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);

/**
 * Clean and normalize MongoDB URI (removing angle brackets if accidentally left in password)
 */
export function formatMongoUri(rawUri) {
  if (!rawUri) return '';
  let uri = rawUri.trim().replace(/^["']|["']$/g, '');
  const match = uri.match(/^mongodb(\+srv)?:\/\/([^:]+):<([^>]+)>@(.*)$/);
  if (match) {
    const proto = match[1] || '';
    const user = match[2];
    const pass = match[3];
    const rest = match[4];
    uri = `mongodb${proto}://${user}:${encodeURIComponent(pass)}@${rest}`;
  }
  uri = uri.replace(/(\.mongodb\.net)\/\/+/, '$1/');
  return uri;
}

/**
 * Sync all SQLite users into MongoDB Atlas to ensure no existing accounts are lost
 */
export async function syncUsersFromSQLiteToMongo(sqliteDb) {
  if (!sqliteDb || !isMongoConnected()) return;
  try {
    const rows = sqliteDb.prepare('SELECT * FROM users').all();
    if (!rows || rows.length === 0) return;

    let syncedCount = 0;
    for (const u of rows) {
      const existing = await MongoUser.findById(u.id).lean();
      if (!existing) {
        await MongoUser.updateOne(
          { _id: u.id },
          {
            $set: {
              _id: u.id,
              name: u.name,
              email: u.email.toLowerCase().trim(),
              password: u.password,
              institution: u.institution || u.college || '',
              role: u.role || 'Learner',
              grade_or_level: u.grade_or_level || u.branch || 'General',
              college: u.college || '',
              branch: u.branch || '',
              semester: u.semester || 1,
              trial_ends_at: u.trial_ends_at ? new Date(u.trial_ends_at) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              subscription_tier: u.subscription_tier || 'free_trial',
              subscription_status: u.subscription_status || 'trialing',
              subscription_expires_at: u.subscription_expires_at ? new Date(u.subscription_expires_at) : null,
              created_at: u.created_at ? new Date(u.created_at) : new Date(),
            },
          },
          { upsert: true }
        );
        syncedCount++;
      }
    }
    if (syncedCount > 0) {
      console.log(`☁️ [MongoDB Atlas] Synced ${syncedCount} existing user account(s) into MongoDB.`);
    }
  } catch (err) {
    console.warn('⚠️ [MongoDB Atlas] Sync from SQLite notice:', err.message);
  }
}

/**
 * Initialize connection to MongoDB Atlas
 */
export async function initMongo(sqliteDb = null) {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!rawUri) {
    console.log('[Database] MONGODB_URI not set. Running in local SQLite mode.');
    return false;
  }

  const cleanUri = formatMongoUri(rawUri);

  connectionPromise = (async () => {
    try {
      console.log('[Database] Connecting to MongoDB Atlas for Authentication & Authorization...');
      await mongoose.connect(cleanUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 12000,
      });
      isConnected = true;
      console.log('✅ [Database] Successfully connected to MongoDB Atlas! Users & Auth stored in MongoDB.');

      // Sync existing accounts if sqliteDb provided
      if (sqliteDb) {
        await syncUsersFromSQLiteToMongo(sqliteDb);
      }

      return true;
    } catch (err) {
      isConnected = false;
      console.warn('⚠️ [Database] MongoDB Atlas connection failed:', err.message);
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
