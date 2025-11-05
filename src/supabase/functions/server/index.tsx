import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const BUCKET_NAME = 'make-7f2aa9ae-files';
const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB
const DEFAULT_RATE_LIMIT = 2; // requests per second

// Initialize storage bucket
async function initBucket() {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
      });
      console.log('Created storage bucket:', BUCKET_NAME);
    }
  } catch (error) {
    console.error('Error initializing bucket:', error);
  }
}

// Initialize bucket on startup
initBucket();

// Helper: Get user from access token
async function getUserFromToken(accessToken: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Helper: Check rate limit
async function checkRateLimit(userId: string): Promise<boolean> {
  const quotaKey = `quota:${userId}`;
  const quota = await kv.get(quotaKey);
  
  const now = Date.now();
  const windowMs = 1000; // 1 second
  
  if (!quota) {
    await kv.set(quotaKey, {
      last_request_time: now,
      request_count: 1,
      storage_used: 0,
      storage_limit: DEFAULT_STORAGE_LIMIT,
      rate_limit: DEFAULT_RATE_LIMIT
    });
    return true;
  }
  
  const timeSinceLastRequest = now - quota.last_request_time;
  
  if (timeSinceLastRequest >= windowMs) {
    // Reset window
    await kv.set(quotaKey, {
      ...quota,
      last_request_time: now,
      request_count: 1
    });
    return true;
  }
  
  if (quota.request_count >= quota.rate_limit) {
    return false;
  }
  
  await kv.set(quotaKey, {
    ...quota,
    request_count: quota.request_count + 1
  });
  
  return true;
}

// Helper: Calculate file hash
async function calculateFileHash(fileData: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Validate MIME type
function getMimeTypeFromBuffer(buffer: Uint8Array): string {
  // Check magic numbers for common file types
  if (buffer.length < 4) return 'application/octet-stream';
  
  const hex = Array.from(buffer.slice(0, 4))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  if (hex.startsWith('89504e47')) return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (hex.startsWith('47494638')) return 'image/gif';
  if (hex.startsWith('25504446')) return 'application/pdf';
  if (hex.startsWith('504b0304')) return 'application/zip';
  
  return 'application/octet-stream';
}

// Health check
app.get("/make-server-7f2aa9ae/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint
app.post("/make-server-7f2aa9ae/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, is_admin } = body;
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, is_admin: is_admin || false }
    });
    
    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    // Create user record
    const userId = data.user.id;
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      name,
      is_admin: is_admin || false,
      created_at: new Date().toISOString()
    });
    
    // Initialize user quota
    await kv.set(`quota:${userId}`, {
      user_id: userId,
      storage_used: 0,
      storage_limit: DEFAULT_STORAGE_LIMIT,
      rate_limit: DEFAULT_RATE_LIMIT,
      last_request_time: Date.now(),
      request_count: 0
    });
    
    return c.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user info
app.get("/make-server-7f2aa9ae/user", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData) {
      // Create user data if not exists (for existing auth users)
      const newUserData = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        is_admin: user.user_metadata?.is_admin || false,
        created_at: user.created_at
      };
      await kv.set(`user:${user.id}`, newUserData);
      return c.json(newUserData);
    }
    
    return c.json(userData);
  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json({ error: error.message }, 401);
  }
});

// Upload files
app.post("/make-server-7f2aa9ae/upload", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    
    // Check rate limit
    if (!await checkRateLimit(user.id)) {
      return c.json({ error: 'Rate limit exceeded. Maximum 2 requests per second.' }, 429);
    }
    
    const formData = await c.req.formData();
    const files = formData.getAll('files') as File[];
    const tags = formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [];
    const folderId = formData.get('folder_id') as string | null;
    const isPublic = formData.get('is_public') === 'true';
    
    if (!files || files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }
    
    const userData = await kv.get(`user:${user.id}`);
    const quotaData = await kv.get(`quota:${user.id}`);
    
    const uploadedFiles = [];
    let totalSize = 0;
    
    for (const file of files) {
      const fileBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);
      const fileSize = fileData.length;
      
      // Check storage quota
      if (quotaData && quotaData.storage_used + totalSize + fileSize > quotaData.storage_limit) {
        return c.json({ 
          error: `Storage quota exceeded. Limit: ${quotaData.storage_limit} bytes, Used: ${quotaData.storage_used + totalSize} bytes` 
        }, 413);
      }
      
      // Calculate hash for deduplication
      const fileHash = await calculateFileHash(fileData);
      
      // Validate MIME type
      const declaredMimeType = file.type;
      const actualMimeType = getMimeTypeFromBuffer(fileData);
      
      if (declaredMimeType && !declaredMimeType.startsWith(actualMimeType.split('/')[0]) && actualMimeType !== 'application/octet-stream') {
        console.warn(`MIME type mismatch for ${file.name}: declared ${declaredMimeType}, detected ${actualMimeType}`);
      }
      
      // Check if file already exists
      let existingFile = await kv.get(`file:${fileHash}`);
      let isDeduplicated = !!existingFile;
      
      if (!existingFile) {
        // Upload to Supabase Storage
        const storagePath = `${fileHash}`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileData, {
            contentType: declaredMimeType || actualMimeType,
            upsert: false
          });
        
        if (uploadError && !uploadError.message.includes('already exists')) {
          console.error('Storage upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }
        
        // Create file metadata
        existingFile = {
          hash: fileHash,
          mime_type: declaredMimeType || actualMimeType,
          size: fileSize,
          storage_path: storagePath,
          reference_count: 0,
          created_at: new Date().toISOString()
        };
        
        await kv.set(`file:${fileHash}`, existingFile);
        totalSize += fileSize;
      }
      
      // Create user file reference
      const fileId = `${user.id}:${fileHash}:${Date.now()}`;
      const fileReference = {
        id: fileId,
        hash: fileHash,
        filename: file.name,
        mime_type: existingFile.mime_type,
        size: existingFile.size,
        upload_date: new Date().toISOString(),
        uploader_id: user.id,
        uploader_name: userData?.name || user.email,
        is_public: isPublic,
        folder_id: folderId,
        tags: tags,
        storage_path: existingFile.storage_path,
        download_count: 0,
        is_deduplicated: isDeduplicated,
        reference_count: existingFile.reference_count + 1
      };
      
      await kv.set(`file_ref:${fileId}`, fileReference);
      
      // Update reference count
      existingFile.reference_count++;
      await kv.set(`file:${fileHash}`, existingFile);
      
      uploadedFiles.push(fileReference);
    }
    
    // Update user quota
    if (quotaData) {
      quotaData.storage_used += totalSize;
      await kv.set(`quota:${user.id}`, quotaData);
    }
    
    return c.json({ success: true, files: uploadedFiles });
  } catch (error: any) {
    console.error('Upload error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get files with filters
app.get("/make-server-7f2aa9ae/files", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    
    // Get all file references for user
    const allRefs = await kv.getByPrefix(`file_ref:${user.id}:`);
    
    // Apply filters
    const filename = c.req.query('filename');
    const mimeType = c.req.query('mime_type');
    const sizeMin = c.req.query('size_min') ? parseInt(c.req.query('size_min')!) : undefined;
    const sizeMax = c.req.query('size_max') ? parseInt(c.req.query('size_max')!) : undefined;
    const dateFrom = c.req.query('date_from');
    const dateTo = c.req.query('date_to');
    const tags = c.req.query('tags')?.split(',').map(t => t.trim());
    const uploaderName = c.req.query('uploader_name');
    
    let files = allRefs.map(ref => ref.value);
    
    if (filename) {
      files = files.filter(f => f.filename.toLowerCase().includes(filename.toLowerCase()));
    }
    
    if (mimeType) {
      files = files.filter(f => f.mime_type === mimeType);
    }
    
    if (sizeMin !== undefined) {
      files = files.filter(f => f.size >= sizeMin);
    }
    
    if (sizeMax !== undefined) {
      files = files.filter(f => f.size <= sizeMax);
    }
    
    if (dateFrom) {
      files = files.filter(f => new Date(f.upload_date) >= new Date(dateFrom));
    }
    
    if (dateTo) {
      files = files.filter(f => new Date(f.upload_date) <= new Date(dateTo));
    }
    
    if (tags && tags.length > 0) {
      files = files.filter(f => 
        f.tags && tags.some(tag => f.tags.includes(tag))
      );
    }
    
    if (uploaderName) {
      files = files.filter(f => 
        f.uploader_name.toLowerCase().includes(uploaderName.toLowerCase())
      );
    }
    
    return c.json({ files });
  } catch (error: any) {
    console.error('Get files error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Download file
app.get("/make-server-7f2aa9ae/download/:fileId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const fileId = c.req.param('fileId');
    
    const fileRef = await kv.get(`file_ref:${fileId}`);
    
    if (!fileRef) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    // Check access permissions
    if (!fileRef.is_public && fileRef.uploader_id !== user.id) {
      // Check if shared with user
      const shareKey = `share:${fileId}:${user.id}`;
      const shareData = await kv.get(shareKey);
      if (!shareData) {
        return c.json({ error: 'Access denied' }, 403);
      }
    }
    
    // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileRef.storage_path, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Create signed URL error:', error);
      return c.json({ error: 'Failed to generate download URL' }, 500);
    }
    
    // Increment download count
    fileRef.download_count++;
    await kv.set(`file_ref:${fileId}`, fileRef);
    
    return c.json({ 
      download_url: data.signedUrl,
      filename: fileRef.filename,
      mime_type: fileRef.mime_type,
      size: fileRef.size
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Delete file
app.delete("/make-server-7f2aa9ae/files/:fileId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const fileId = c.req.param('fileId');
    
    const fileRef = await kv.get(`file_ref:${fileId}`);
    
    if (!fileRef) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    // Only uploader can delete
    if (fileRef.uploader_id !== user.id) {
      return c.json({ error: 'Only the uploader can delete this file' }, 403);
    }
    
    const fileHash = fileRef.hash;
    const fileData = await kv.get(`file:${fileHash}`);
    
    if (fileData) {
      // Decrement reference count
      fileData.reference_count--;
      
      if (fileData.reference_count <= 0) {
        // Delete actual file from storage
        await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .remove([fileData.storage_path]);
        
        // Delete file metadata
        await kv.del(`file:${fileHash}`);
      } else {
        // Update reference count
        await kv.set(`file:${fileHash}`, fileData);
      }
    }
    
    // Delete file reference
    await kv.del(`file_ref:${fileId}`);
    
    // Update user quota
    const quotaData = await kv.get(`quota:${user.id}`);
    if (quotaData && fileData?.reference_count <= 0) {
      quotaData.storage_used = Math.max(0, quotaData.storage_used - fileRef.size);
      await kv.set(`quota:${user.id}`, quotaData);
    }
    
    return c.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get storage stats
app.get("/make-server-7f2aa9ae/stats", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    
    const quotaData = await kv.get(`quota:${user.id}`) || {
      storage_used: 0,
      storage_limit: DEFAULT_STORAGE_LIMIT
    };
    
    const allRefs = await kv.getByPrefix(`file_ref:${user.id}:`);
    const files = allRefs.map(ref => ref.value);
    
    const totalStorageUsed = files.reduce((sum, f) => 
      f.is_deduplicated ? sum : sum + f.size, 0
    );
    
    const originalStorageUsage = files.reduce((sum, f) => sum + f.size, 0);
    const storageSavings = originalStorageUsage - totalStorageUsed;
    const storageSavingsPercentage = originalStorageUsage > 0 
      ? (storageSavings / originalStorageUsage) * 100 
      : 0;
    
    const deduplicatedCount = files.filter(f => f.is_deduplicated).length;
    
    return c.json({
      storage_used: quotaData.storage_used,
      storage_limit: quotaData.storage_limit,
      total_storage_used: totalStorageUsed,
      original_storage_usage: originalStorageUsage,
      storage_savings: storageSavings,
      storage_savings_percentage: storageSavingsPercentage,
      file_count: files.length,
      deduplicated_count: deduplicatedCount
    });
  } catch (error: any) {
    console.error('Stats error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Share file
app.post("/make-server-7f2aa9ae/share", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const body = await c.req.json();
    const { file_id, is_public, shared_with_user_email } = body;
    
    const fileRef = await kv.get(`file_ref:${file_id}`);
    
    if (!fileRef) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    if (fileRef.uploader_id !== user.id) {
      return c.json({ error: 'Only the uploader can share this file' }, 403);
    }
    
    if (is_public) {
      fileRef.is_public = true;
      await kv.set(`file_ref:${file_id}`, fileRef);
    }
    
    if (shared_with_user_email) {
      // Find user by email
      const allUsers = await kv.getByPrefix('user:');
      const targetUser = allUsers.find(u => u.value.email === shared_with_user_email);
      
      if (!targetUser) {
        return c.json({ error: 'User not found' }, 404);
      }
      
      // Create share record
      const shareKey = `share:${file_id}:${targetUser.value.id}`;
      await kv.set(shareKey, {
        file_id,
        shared_with_user_id: targetUser.value.id,
        shared_by_user_id: user.id,
        created_at: new Date().toISOString()
      });
    }
    
    return c.json({ success: true, message: 'File shared successfully' });
  } catch (error: any) {
    console.error('Share error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Admin: Get all files
app.get("/make-server-7f2aa9ae/admin/files", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData?.is_admin) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const allRefs = await kv.getByPrefix('file_ref:');
    const files = allRefs.map(ref => ref.value);
    
    return c.json({ files });
  } catch (error: any) {
    console.error('Admin get files error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Admin: Get all users
app.get("/make-server-7f2aa9ae/admin/users", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'No access token provided' }, 401);
    }
    
    const user = await getUserFromToken(accessToken);
    const userData = await kv.get(`user:${user.id}`);
    
    if (!userData?.is_admin) {
      return c.json({ error: 'Admin access required' }, 403);
    }
    
    const allUsers = await kv.getByPrefix('user:');
    const allQuotas = await kv.getByPrefix('quota:');
    
    const users = allUsers.map(u => {
      const quota = allQuotas.find(q => q.value.user_id === u.value.id);
      return {
        ...u.value,
        storage_used: quota?.value.storage_used || 0,
        storage_limit: quota?.value.storage_limit || DEFAULT_STORAGE_LIMIT
      };
    });
    
    return c.json({ users });
  } catch (error: any) {
    console.error('Admin get users error:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);