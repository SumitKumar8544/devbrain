import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

// User schema for MongoDB Atlas
const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // Keep matching 'user-...' ID format
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    institution: { type: String, default: '' },
    role: { type: String, default: 'Learner' },
    grade_or_level: { type: String, default: 'General' },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: { createdAt: 'created_at', updatedAt: false } }
);

export const MongoUser = mongoose.models.User || mongoose.model('User', UserSchema);

/**
 * Clean and normalize MongoDB URI (removing angle brackets if accidentally left in password)
 */
export function formatMongoUri(rawUri) {
  if (!rawUri) return '';
  let uri = rawUri.trim();
  // If user pasted mongodb+srv://user:<password>@host
  // Notice angle brackets around password
  const match = uri.match(/^mongodb(\+srv)?:\/\/([^:]+):<([^>]+)>@(.*)$/);
  if (match) {
    const proto = match[1] || '';
    const user = match[2];
    const pass = match[3];
    const rest = match[4];
    uri = `mongodb${proto}://${user}:${encodeURIComponent(pass)}@${rest}`;
  }
  return uri;
}

/**
 * Initialize connection to MongoDB Atlas
 */
export async function initMongo() {
  const rawUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!rawUri) {
    console.log('[Database] MONGODB_URI not set. Running in local SQLite mode.');
    return false;
  }

  const cleanUri = formatMongoUri(rawUri);

  try {
    console.log('[Database] Connecting to MongoDB Atlas...');
    await mongoose.connect(cleanUri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 10000,
    });
    isConnected = true;
    console.log(' [Database] Successfully connected to MongoDB Atlas! Users & Auth stored in Cloud.');
    return true;
  } catch (err) {
    isConnected = false;
    console.warn('⚠️ [Database] MongoDB Atlas connection failed:', err.message);
    console.warn('⚠️ [Database] Falling back seamlessly to local SQLite storage.');
    return false;
  }
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}
