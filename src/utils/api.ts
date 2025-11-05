import { projectId, publicAnonKey } from './supabase/info';
import { supabase } from './supabase/client';
import { getDemoSession, demoSignup, demoSignin, clearDemoSession, enableDemoMode } from './demoAuth';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7f2aa9ae`;

// Check if we're in demo mode
function isInDemoMode(): boolean {
  return !!getDemoSession();
}

async function getAccessToken(): Promise<string | null> {
  // Check demo session first
  const demoSession = getDemoSession();
  if (demoSession) {
    return demoSession.access_token;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const demoSession = getDemoSession();
  if (demoSession) {
    return demoSession.userId;
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function signup(email: string, password: string, name: string, isAdmin: boolean = false) {
  try {
    // Try Supabase Auth first
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          is_admin: isAdmin
        },
        emailRedirectTo: window.location.origin
      }
    });

    if (authError) {
      throw authError;
    }

    if (!data.user) {
      throw new Error('Signup failed - no user returned');
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation is required - switch to demo mode
      console.log('Email confirmation required, switching to demo mode');
      enableDemoMode();
      const demoSession = await demoSignup(email, password, name, isAdmin);
      return { 
        success: true, 
        user: { id: demoSession.userId, email: demoSession.email },
        session: { access_token: demoSession.access_token },
        isDemoMode: true
      };
    }

    // Store user data in KV store
    if (data.user) {
      await initializeUserData(data.user.id, email, name, isAdmin);
    }

    return { success: true, user: data.user, session: data.session, isDemoMode: false };
  } catch (error: any) {
    // If Supabase signup fails, use demo mode
    console.log('Supabase signup failed, using demo mode:', error.message);
    enableDemoMode();
    const demoSession = await demoSignup(email, password, name, isAdmin);
    return { 
      success: true, 
      user: { id: demoSession.userId, email: demoSession.email },
      session: { access_token: demoSession.access_token },
      isDemoMode: true
    };
  }
}

export async function signin(email: string, password: string) {
  // Check if we should use demo mode
  const demoSession = getDemoSession();
  
  if (demoSession || localStorage.getItem('use_demo_mode') === 'true') {
    // Use demo signin
    try {
      const session = demoSignin(email, password);
      return {
        success: true,
        user: { id: session.userId, email: session.email },
        session: { access_token: session.access_token },
        isDemoMode: true
      };
    } catch (error: any) {
      throw new Error(error.message || 'Invalid email or password');
    }
  }

  // Try Supabase auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // If credentials are invalid, maybe user is in demo mode
      console.log('Supabase signin failed, trying demo mode');
      enableDemoMode();
      const session = demoSignin(email, password);
      return {
        success: true,
        user: { id: session.userId, email: session.email },
        session: { access_token: session.access_token },
        isDemoMode: true
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      isDemoMode: false
    };
  } catch (error: any) {
    throw new Error(error.message || 'Sign in failed');
  }
}

export async function signout() {
  clearDemoSession();
  await supabase.auth.signOut();
}

// Helper function to initialize user data
async function initializeUserData(userId: string, email: string, name: string, isAdmin: boolean) {
  try {
    // Store user info
    await supabase.from('kv_store_7f2aa9ae').upsert({
      key: `user:${userId}`,
      value: {
        id: userId,
        email,
        name,
        is_admin: isAdmin,
        created_at: new Date().toISOString()
      }
    });

    // Initialize quota
    await supabase.from('kv_store_7f2aa9ae').upsert({
      key: `quota:${userId}`,
      value: {
        user_id: userId,
        storage_used: 0,
        storage_limit: 10 * 1024 * 1024, // 10 MB
        rate_limit: 2,
        last_request_time: Date.now(),
        request_count: 0
      }
    });

    console.log('User data initialized successfully');
  } catch (error) {
    console.error('Failed to initialize user data:', error);
    // Don't throw - user is created, data initialization can be retried
  }
}

export async function uploadFiles(files: File[], options: {
  tags?: string[];
  folderId?: string | null;
  isPublic?: boolean;
} = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await uploadFilesDemoMode(files, options);
  }

  // Use client-side upload directly
  return await uploadFilesClientSide(files, options);
}

// Demo mode upload implementation (completely local)
async function uploadFilesDemoMode(files: File[], options: {
  tags?: string[];
  folderId?: string | null;
  isPublic?: boolean;
}) {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  const userId = demoSession.userId;
  const quota = demoStorage.getUserQuota(userId);
  const uploadedFiles = [];
  let totalSize = 0;

  for (const file of files) {
    const fileSize = file.size;

    // Check quota
    if (quota.storage_used + totalSize + fileSize > quota.storage_limit) {
      throw new Error(`Storage quota exceeded. Limit: ${(quota.storage_limit / 1024 / 1024).toFixed(2)} MB`);
    }

    // Calculate hash
    const fileHash = await demoStorage.calculateFileHash(file);

    // Check if file exists
    let existingFile = demoStorage.getFileMetadata(fileHash);
    let isDeduplicated = !!existingFile;

    if (!existingFile) {
      // Store file
      await demoStorage.storeFile(fileHash, file);
      existingFile = demoStorage.getFileMetadata(fileHash)!;
      totalSize += fileSize;
    }

    // Create file reference
    const fileId = `${userId}:${fileHash}:${Date.now()}`;
    const fileReference: any = {
      id: fileId,
      hash: fileHash,
      filename: file.name,
      mime_type: file.type,
      size: fileSize,
      upload_date: new Date().toISOString(),
      uploader_id: userId,
      uploader_name: demoSession.name,
      is_public: options.isPublic || false,
      folder_id: options.folderId || null,
      tags: options.tags || [],
      storage_path: fileHash,
      download_count: 0,
      is_deduplicated: isDeduplicated,
      reference_count: 1
    };

    demoStorage.storeFileReference(fileId, fileReference);
    uploadedFiles.push(fileReference);
  }

  // Update quota
  quota.storage_used += totalSize;
  demoStorage.updateUserQuota(userId, quota);

  return { success: true, files: uploadedFiles };
}

// Client-side upload implementation
async function uploadFilesClientSide(files: File[], options: {
  tags?: string[];
  folderId?: string | null;
  isPublic?: boolean;
}) {
  const { calculateFileHash, getUserQuota, updateUserQuota, getFileMetadata, storeFileMetadata, storeFileReference, ensureBucketExists } = await import('./fileOperations');
  
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  // Ensure bucket exists
  await ensureBucketExists();

  const userData = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `user:${userId}`)
    .single();

  const quota = await getUserQuota(userId);
  const uploadedFiles = [];
  let totalSize = 0;

  for (const file of files) {
    const fileSize = file.size;

    // Check quota
    if (quota.storage_used + totalSize + fileSize > quota.storage_limit) {
      throw new Error(`Storage quota exceeded. Limit: ${quota.storage_limit} bytes`);
    }

    // Calculate hash
    const fileHash = await calculateFileHash(file);

    // Check if file exists
    let existingFile = await getFileMetadata(fileHash);
    let isDeduplicated = !!existingFile;

    if (!existingFile) {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('make-7f2aa9ae-files')
        .upload(fileHash, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError && !uploadError.message.includes('already exists')) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Store metadata
      existingFile = {
        hash: fileHash,
        mime_type: file.type,
        size: fileSize,
        storage_path: fileHash,
        reference_count: 0,
        created_at: new Date().toISOString()
      };

      await storeFileMetadata(fileHash, existingFile);
      totalSize += fileSize;
    }

    // Create file reference
    const fileId = `${userId}:${fileHash}:${Date.now()}`;
    const fileReference = {
      id: fileId,
      hash: fileHash,
      filename: file.name,
      mime_type: file.type,
      size: fileSize,
      upload_date: new Date().toISOString(),
      uploader_id: userId,
      uploader_name: userData?.value?.name || 'User',
      is_public: options.isPublic || false,
      folder_id: options.folderId || null,
      tags: options.tags || [],
      storage_path: fileHash,
      download_count: 0,
      is_deduplicated: isDeduplicated,
      reference_count: existingFile.reference_count + 1
    };

    await storeFileReference(fileId, fileReference);

    // Update reference count
    existingFile.reference_count++;
    await storeFileMetadata(fileHash, existingFile);

    uploadedFiles.push(fileReference);
  }

  // Update quota
  quota.storage_used += totalSize;
  await updateUserQuota(userId, quota);

  return { success: true, files: uploadedFiles };
}

export async function getFiles(filters?: {
  filename?: string;
  mime_type?: string;
  size_min?: number;
  size_max?: number;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  uploader_name?: string;
}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await getFilesDemoMode(filters);
  }

  // Use client-side directly
  return await getFilesClientSide(filters);
}

// Demo mode get files
async function getFilesDemoMode(filters?: any) {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  let files = demoStorage.getAllFileReferences(demoSession.userId);

  // Apply filters
  if (filters) {
    if (filters.filename) {
      files = files.filter(f => f.filename.toLowerCase().includes(filters.filename.toLowerCase()));
    }
    if (filters.mime_type) {
      files = files.filter(f => f.mime_type === filters.mime_type);
    }
    if (filters.size_min) {
      files = files.filter(f => f.size >= filters.size_min);
    }
    if (filters.size_max) {
      files = files.filter(f => f.size <= filters.size_max);
    }
    if (filters.date_from) {
      files = files.filter(f => new Date(f.upload_date) >= new Date(filters.date_from));
    }
    if (filters.date_to) {
      files = files.filter(f => new Date(f.upload_date) <= new Date(filters.date_to));
    }
    if (filters.tags && filters.tags.length > 0) {
      files = files.filter(f => filters.tags.some((tag: string) => f.tags.includes(tag)));
    }
    if (filters.uploader_name) {
      files = files.filter(f => f.uploader_name.toLowerCase().includes(filters.uploader_name.toLowerCase()));
    }
  }

  return { files };
}

// Client-side get files
async function getFilesClientSide(filters?: any) {
  const { getUserFileReferences } = await import('./fileOperations');
  
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  let files = await getUserFileReferences(userId);

  // Apply filters
  if (filters) {
    if (filters.filename) {
      files = files.filter((f: any) => f.filename.toLowerCase().includes(filters.filename.toLowerCase()));
    }
    if (filters.mime_type) {
      files = files.filter((f: any) => f.mime_type === filters.mime_type);
    }
    if (filters.size_min !== undefined) {
      files = files.filter((f: any) => f.size >= filters.size_min);
    }
    if (filters.size_max !== undefined) {
      files = files.filter((f: any) => f.size <= filters.size_max);
    }
    if (filters.date_from) {
      files = files.filter((f: any) => new Date(f.upload_date) >= new Date(filters.date_from));
    }
    if (filters.date_to) {
      files = files.filter((f: any) => new Date(f.upload_date) <= new Date(filters.date_to));
    }
    if (filters.tags && filters.tags.length > 0) {
      files = files.filter((f: any) => 
        f.tags && filters.tags.some((tag: string) => f.tags.includes(tag))
      );
    }
    if (filters.uploader_name) {
      files = files.filter((f: any) => 
        f.uploader_name.toLowerCase().includes(filters.uploader_name.toLowerCase())
      );
    }
  }

  return { files };
}

export async function downloadFile(fileId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await downloadFileDemoMode(fileId);
  }

  // Use client-side directly
  return await downloadFileClientSide(fileId);
}

// Demo mode download
async function downloadFileDemoMode(fileId: string) {
  const demoStorage = await import('./demoStorage');
  
  const fileRef = demoStorage.getFileReference(fileId);
  if (!fileRef) {
    throw new Error('File not found');
  }

  const fileBlob = demoStorage.getFile(fileRef.hash);
  if (!fileBlob) {
    throw new Error('File data not found');
  }

  // Create download URL
  const url = URL.createObjectURL(fileBlob);

  // Increment download count
  demoStorage.incrementDownloadCount(fileId);

  return { url, filename: fileRef.filename };
}

// Client-side download
async function downloadFileClientSide(fileId: string) {
  const { data: fileRefData } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `file_ref:${fileId}`)
    .single();

  if (!fileRefData) {
    throw new Error('File not found');
  }

  const fileRef = fileRefData.value;

  // Generate signed URL
  const { data, error } = await supabase.storage
    .from('make-7f2aa9ae-files')
    .createSignedUrl(fileRef.storage_path, 3600);

  if (error) {
    throw new Error('Failed to generate download URL');
  }

  // Increment download count
  fileRef.download_count++;
  await supabase.from('kv_store_7f2aa9ae').upsert({
    key: `file_ref:${fileId}`,
    value: fileRef
  });

  return {
    download_url: data.signedUrl,
    filename: fileRef.filename,
    mime_type: fileRef.mime_type,
    size: fileRef.size
  };
}

export async function deleteFile(fileId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await deleteFileDemoMode(fileId);
  }

  // Use client-side directly
  return await deleteFileClientSide(fileId);
}

// Demo mode delete
async function deleteFileDemoMode(fileId: string) {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  const fileRef = demoStorage.getFileReference(fileId);
  if (!fileRef) {
    throw new Error('File not found');
  }

  // Check ownership
  if (fileRef.uploader_id !== demoSession.userId) {
    throw new Error('Only the uploader can delete this file');
  }

  // Delete reference
  demoStorage.deleteFileReference(fileId);

  // Update quota
  const quota = demoStorage.getUserQuota(demoSession.userId);
  if (!fileRef.is_deduplicated) {
    quota.storage_used = Math.max(0, quota.storage_used - fileRef.size);
    demoStorage.updateUserQuota(demoSession.userId, quota);
  }

  return { success: true };
}

// Client-side delete
async function deleteFileClientSide(fileId: string) {
  const { deleteFileReference, getFileMetadata, storeFileMetadata, getUserQuota, updateUserQuota } = await import('./fileOperations');
  
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: fileRefData } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `file_ref:${fileId}`)
    .single();

  if (!fileRefData) {
    throw new Error('File not found');
  }

  const fileRef = fileRefData.value;

  // Check ownership
  if (fileRef.uploader_id !== userId) {
    throw new Error('Only the uploader can delete this file');
  }

  const fileHash = fileRef.hash;
  const fileData = await getFileMetadata(fileHash);

  if (fileData) {
    // Decrement reference count
    fileData.reference_count--;

    if (fileData.reference_count <= 0) {
      // Delete from storage
      await supabase.storage
        .from('make-7f2aa9ae-files')
        .remove([fileData.storage_path]);

      // Delete metadata
      await supabase.from('kv_store_7f2aa9ae')
        .delete()
        .eq('key', `file:${fileHash}`);
    } else {
      // Update reference count
      await storeFileMetadata(fileHash, fileData);
    }
  }

  // Delete reference
  await deleteFileReference(fileId);

  // Update quota
  const quota = await getUserQuota(userId);
  if (fileData?.reference_count <= 0) {
    quota.storage_used = Math.max(0, quota.storage_used - fileRef.size);
    await updateUserQuota(userId, quota);
  }

  return { success: true, message: 'File deleted successfully' };
}

export async function getStats() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await getStatsDemoMode();
  }

  // Use client-side directly
  return await getStatsClientSide();
}

// Demo mode stats
async function getStatsDemoMode() {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  const quota = demoStorage.getUserQuota(demoSession.userId);
  const files = demoStorage.getAllFileReferences(demoSession.userId);

  const totalStorageUsed = files.reduce((sum, f) => 
    f.is_deduplicated ? sum : sum + f.size, 0
  );

  const originalStorageUsage = files.reduce((sum, f) => sum + f.size, 0);
  const storageSavings = originalStorageUsage - totalStorageUsed;
  const storageSavingsPercentage = originalStorageUsage > 0 
    ? (storageSavings / originalStorageUsage) * 100 
    : 0;

  const deduplicatedCount = files.filter(f => f.is_deduplicated).length;

  return {
    storage_used: quota.storage_used,
    storage_limit: quota.storage_limit,
    total_storage_used: totalStorageUsed,
    original_storage_usage: originalStorageUsage,
    storage_savings: storageSavings,
    storage_savings_percentage: storageSavingsPercentage,
    file_count: files.length,
    deduplicated_count: deduplicatedCount
  };
}

// Client-side stats
async function getStatsClientSide() {
  const { getUserQuota, getUserFileReferences } = await import('./fileOperations');
  
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const quota = await getUserQuota(userId);
  const files = await getUserFileReferences(userId);

  const totalStorageUsed = files.reduce((sum: number, f: any) => 
    f.is_deduplicated ? sum : sum + f.size, 0
  );

  const originalStorageUsage = files.reduce((sum: number, f: any) => sum + f.size, 0);
  const storageSavings = originalStorageUsage - totalStorageUsed;
  const storageSavingsPercentage = originalStorageUsage > 0 
    ? (storageSavings / originalStorageUsage) * 100 
    : 0;

  const deduplicatedCount = files.filter((f: any) => f.is_deduplicated).length;

  return {
    storage_used: quota.storage_used,
    storage_limit: quota.storage_limit,
    total_storage_used: totalStorageUsed,
    original_storage_usage: originalStorageUsage,
    storage_savings: storageSavings,
    storage_savings_percentage: storageSavingsPercentage,
    file_count: files.length,
    deduplicated_count: deduplicatedCount
  };
}

export async function shareFile(fileId: string, isPublic: boolean, sharedWithUserEmail?: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await shareFileDemoMode(fileId, isPublic, sharedWithUserEmail);
  }

  // Use client-side directly
  return await shareFileClientSide(fileId, isPublic, sharedWithUserEmail);
}

// Demo mode share
async function shareFileDemoMode(fileId: string, isPublic: boolean, sharedWithUserEmail?: string) {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  const fileRef = demoStorage.getFileReference(fileId);
  if (!fileRef) {
    throw new Error('File not found');
  }

  if (fileRef.uploader_id !== demoSession.userId) {
    throw new Error('Only the uploader can share this file');
  }

  if (isPublic) {
    fileRef.is_public = true;
    demoStorage.storeFileReference(fileId, fileRef);
  }

  if (sharedWithUserEmail) {
    const users = demoStorage.getAllUsers();
    const targetUser = users.find(u => u.email === sharedWithUserEmail);

    if (!targetUser) {
      throw new Error('User not found');
    }

    demoStorage.storeSharePermission(fileId, targetUser.id);
  }

  return { success: true };
}

// Client-side share
async function shareFileClientSide(fileId: string, isPublic: boolean, sharedWithUserEmail?: string) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: fileRefData } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `file_ref:${fileId}`)
    .single();

  if (!fileRefData) {
    throw new Error('File not found');
  }

  const fileRef = fileRefData.value;

  if (fileRef.uploader_id !== userId) {
    throw new Error('Only the uploader can share this file');
  }

  if (isPublic) {
    fileRef.is_public = true;
    await supabase.from('kv_store_7f2aa9ae').upsert({
      key: `file_ref:${fileId}`,
      value: fileRef
    });
  }

  if (sharedWithUserEmail) {
    // Find user by email
    const { data: users } = await supabase
      .from('kv_store_7f2aa9ae')
      .select('key, value')
      .like('key', 'user:%');

    const targetUser = users?.find(u => u.value.email === sharedWithUserEmail);

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Create share record
    const shareKey = `share:${fileId}:${targetUser.value.id}`;
    await supabase.from('kv_store_7f2aa9ae').upsert({
      key: shareKey,
      value: {
        file_id: fileId,
        shared_with_user_id: targetUser.value.id,
        shared_by_user_id: user.id,
        created_at: new Date().toISOString()
      }
    });
  }

  return { success: true, message: 'File shared successfully' };
}

export async function getUserInfo() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  const demoSession = getDemoSession();
  if (demoSession) {
    // Get user from localStorage (not Supabase - RLS blocks client reads in demo)
    try {
      const userKey = `demo_kv:user:${demoSession.userId}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        return JSON.parse(userData);
      }
    } catch (e) {
      console.log('Failed to get user from localStorage:', e);
    }

    // Return demo session data as fallback
    return {
      id: demoSession.userId,
      email: demoSession.email,
      name: demoSession.name,
      is_admin: demoSession.is_admin,
      created_at: demoSession.created_at
    };
  }

  // Get user from Supabase Auth
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  
  if (!user) {
    throw new Error('User not found');
  }

  // Try to get user data from KV store directly
  try {
    const { data, error: kvError } = await supabase
      .from('kv_store_7f2aa9ae')
      .select('value')
      .eq('key', `user:${user.id}`)
      .single();

    if (data && !kvError) {
      return data.value;
    }
  } catch (kvError) {
    console.log('KV lookup failed, initializing user data:', kvError);
    // Initialize user data if it doesn't exist
    const userData = {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      is_admin: user.user_metadata?.is_admin || false,
      created_at: user.created_at
    };
    
    await initializeUserData(user.id, userData.email, userData.name, userData.is_admin);
    return userData;
  }

  // Return basic user info from auth
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    is_admin: user.user_metadata?.is_admin || false,
    created_at: user.created_at
  };
}

export async function getAdminFiles() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await getAdminFilesDemoMode();
  }

  // Use client-side directly
  return await getAdminFilesClientSide();
}

// Demo mode admin files
async function getAdminFilesDemoMode() {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  if (!demoSession.is_admin) {
    throw new Error('Admin access required');
  }

  const files = demoStorage.getAllFileReferencesAdmin();
  return { files };
}

// Client-side admin files
async function getAdminFilesClientSide() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: userData } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `user:${userId}`)
    .single();

  if (!userData?.value?.is_admin) {
    throw new Error('Admin access required');
  }

  const { data: allRefs } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('key, value')
    .like('key', 'file_ref:%');

  const files = allRefs?.map(ref => ref.value) || [];

  return { files };
}

export async function getAdminUsers() {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  // Check if in demo mode
  if (isInDemoMode()) {
    return await getAdminUsersDemoMode();
  }

  // Use client-side directly
  return await getAdminUsersClientSide();
}

// Demo mode admin users
async function getAdminUsersDemoMode() {
  const demoStorage = await import('./demoStorage');
  const demoSession = getDemoSession();
  if (!demoSession) throw new Error('Not authenticated');

  if (!demoSession.is_admin) {
    throw new Error('Admin access required');
  }

  const users = demoStorage.getAllUsers();
  
  // Add quota info to users
  const usersWithQuota = users.map((user: any) => {
    const quota = demoStorage.getUserQuota(user.id);
    return {
      ...user,
      storage_used: quota.storage_used,
      storage_limit: quota.storage_limit
    };
  });

  return { users: usersWithQuota };
}

// Client-side admin users
async function getAdminUsersClientSide() {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');

  const { data: userData } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('value')
    .eq('key', `user:${userId}`)
    .single();

  if (!userData?.value?.is_admin) {
    throw new Error('Admin access required');
  }

  const { data: allUsers } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('key, value')
    .like('key', 'user:%');

  const { data: allQuotas } = await supabase
    .from('kv_store_7f2aa9ae')
    .select('key, value')
    .like('key', 'quota:%');

  const users = allUsers?.map(u => {
    const quota = allQuotas?.find(q => q.value.user_id === u.value.id);
    return {
      ...u.value,
      storage_used: quota?.value.storage_used || 0,
      storage_limit: quota?.value.storage_limit || 10485760
    };
  }) || [];

  return { users };
}
