import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import crypto from 'node:crypto';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fjqgmmxpzmtzfzxvvymk.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || 'sb_publishable_UuXpjBTz4oGl2jqEhT9xCA_twvMcze2';
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'vault';

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[Supabase Storage] Initialized successfully for project:', SUPABASE_URL);
  } catch (err) {
    console.warn('[Supabase Storage] Initialization warning:', err.message);
  }
}

/**
 * Uploads a file buffer or stream to Supabase Storage bucket.
 * Returns { url, key, isCloud: true } on success, or null on failure.
 */
export async function uploadToSupabase(fileBuffer, originalName, mimeType) {
  if (!supabase) return null;

  try {
    const ext = path.extname(originalName) || '';
    const safeBase = originalName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const storagePath = `uploads/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.warn(`[Supabase Storage] Upload error to bucket "${BUCKET_NAME}":`, error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return {
      url: publicUrlData.publicUrl,
      key: storagePath,
      isCloud: true,
    };
  } catch (err) {
    console.warn('[Supabase Storage] Exception during upload:', err.message);
    return null;
  }
}

export { supabase, BUCKET_NAME };
