import { supabase } from './supabase/client';

const BUCKET_NAME = 'make-7f2aa9ae-files';
const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB
const DEFAULT_RATE_LIMIT = 2; // requests per second

// Ensure bucket exists
export async function ensureBucketExists() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error('Failed to create bucket:', error);
      }
    }
  } catch (error) {
    console.error('Bucket check failed:', error);
  }
}

// Calculate SHA-256 hash of file
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get user quota
export async function getUserQuota(userId: string) {
  const { data, error } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `quota:${userId}`)
    .single();

  if (error || !data) {
    // Initialize quota if not exists
    const defaultQuota = {
      user_id: userId,
      storage_used: 0,
      storage_limit: DEFAULT_STORAGE_LIMIT,
      rate_limit: DEFAULT_RATE_LIMIT,
      last_request_time: Date.now(),
      request_count: 0
    };

    await supabase.from('kv_store_7f2aa9ae').upsert({
      key: `quota:${userId}`,
      value: defaultQuota
    });

    return defaultQuota;
  }

  return data.value;
}

// Update user quota
export async function updateUserQuota(userId: string, quota: any) {
  const { error } = await supabase
    .from('kv_store_7f2aa9ae')
    .upsert({
      key: `quota:${userId}`,
      value: quota
    });

  if (error) {
    console.error('Failed to update quota:', error);
  }
}

// Check rate limit
export async function checkRateLimit(userId: string): Promise<boolean> {
  const quota = await getUserQuota(userId);
  const now = Date.now();
  const windowMs = 1000; // 1 second

  const timeSinceLastRequest = now - quota.last_request_time;

  if (timeSinceLastRequest >= windowMs) {
    // Reset window
    quota.last_request_time = now;
    quota.request_count = 1;
    await updateUserQuota(userId, quota);
    return true;
  }

  if (quota.request_count >= quota.rate_limit) {
    return false;
  }

  quota.request_count++;
  await updateUserQuota(userId, quota);
  return true;
}

// Get file metadata from hash
export async function getFileMetadata(hash: string) {
  const { data, error } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `file:${hash}`)
    .single();

  if (error || !data) {
    return null;
  }

  return data.value;
}

// Store file metadata
export async function storeFileMetadata(hash: string, metadata: any) {
  const { error } = await supabase
    .from('kv_store_7f2aa9ae')
    .upsert({
      key: `file:${hash}`,
      value: metadata
    });

  if (error) {
    throw new Error(`Failed to store file metadata: ${error.message}`);
  }
}

// Store file reference
export async function storeFileReference(fileId: string, reference: any) {
  const { error } = await supabase
    .from('kv_store_7f2aa9ae')
    .upsert({
      key: `file_ref:${fileId}`,
      value: reference
    });

  if (error) {
    throw new Error(`Failed to store file reference: ${error.message}`);
  }
}

// Get user's file references
export async function getUserFileReferences(userId: string) {
  const { data, error } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('key, value')
    .like('key', `file_ref:${userId}:%`);

  if (error) {
    console.error('Failed to get file references:', error);
    return [];
  }

  return data?.map(item => item.value) || [];
}

// Delete file reference
export async function deleteFileReference(fileId: string) {
  const { error } = await supabase
    .from('kv_store_7f2aa9ae')
    .delete()
    .eq('key', `file_ref:${fileId}`);

  if (error) {
    throw new Error(`Failed to delete file reference: ${error.message}`);
  }
}
