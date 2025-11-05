// Demo storage system - completely local, no Supabase writes
// All data stored in localStorage with base64-encoded files

export interface DemoFile {
  hash: string;
  data: string; // base64 encoded
  mime_type: string;
  size: number;
}

export interface DemoFileReference {
  id: string;
  hash: string;
  filename: string;
  mime_type: string;
  size: number;
  upload_date: string;
  uploader_id: string;
  uploader_name: string;
  is_public: boolean;
  folder_id: string | null;
  tags: string[];
  storage_path: string;
  download_count: number;
  is_deduplicated: boolean;
  reference_count: number;
}

export interface DemoQuota {
  user_id: string;
  storage_used: number;
  storage_limit: number;
  rate_limit: number;
  last_request_time: number;
  request_count: number;
}

// Get from localStorage with prefix
function getLocalItem<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`demo_kv:${key}`);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

// Set to localStorage with prefix
function setLocalItem(key: string, value: any) {
  localStorage.setItem(`demo_kv:${key}`, JSON.stringify(value));
}

// Get all keys with prefix
function getKeysWithPrefix(prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`demo_kv:${prefix}`)) {
      keys.push(key.replace('demo_kv:', ''));
    }
  }
  return keys;
}

// File operations
export async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const parts = base64.split(',');
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

// Quota operations
export function getUserQuota(userId: string): DemoQuota {
  const quota = getLocalItem<DemoQuota>(`quota:${userId}`);
  if (!quota) {
    // Initialize default quota
    const defaultQuota: DemoQuota = {
      user_id: userId,
      storage_used: 0,
      storage_limit: 10 * 1024 * 1024, // 10 MB
      rate_limit: 2,
      last_request_time: Date.now(),
      request_count: 0
    };
    setLocalItem(`quota:${userId}`, defaultQuota);
    return defaultQuota;
  }
  return quota;
}

export function updateUserQuota(userId: string, quota: DemoQuota) {
  setLocalItem(`quota:${userId}`, quota);
}

// File metadata operations
export function getFileMetadata(hash: string): DemoFile | null {
  return getLocalItem<DemoFile>(`file:${hash}`);
}

export function storeFileMetadata(hash: string, metadata: DemoFile) {
  setLocalItem(`file:${hash}`, metadata);
}

export async function storeFile(hash: string, file: File): Promise<void> {
  const base64 = await fileToBase64(file);
  const metadata: DemoFile = {
    hash,
    data: base64,
    mime_type: file.type,
    size: file.size
  };
  storeFileMetadata(hash, metadata);
}

export function getFile(hash: string): Blob | null {
  const metadata = getFileMetadata(hash);
  if (!metadata) return null;
  return base64ToBlob(metadata.data, metadata.mime_type);
}

// File reference operations
export function storeFileReference(fileId: string, reference: DemoFileReference) {
  setLocalItem(`file_ref:${fileId}`, reference);
}

export function getFileReference(fileId: string): DemoFileReference | null {
  return getLocalItem<DemoFileReference>(`file_ref:${fileId}`);
}

export function getAllFileReferences(userId: string): DemoFileReference[] {
  const keys = getKeysWithPrefix('file_ref:');
  const references: DemoFileReference[] = [];
  
  for (const key of keys) {
    const ref = getLocalItem<DemoFileReference>(key);
    if (ref && ref.uploader_id === userId) {
      references.push(ref);
    }
  }
  
  return references;
}

export function getAllFileReferencesAdmin(): DemoFileReference[] {
  const keys = getKeysWithPrefix('file_ref:');
  const references: DemoFileReference[] = [];
  
  for (const key of keys) {
    const ref = getLocalItem<DemoFileReference>(key);
    if (ref) {
      references.push(ref);
    }
  }
  
  return references;
}

export function deleteFileReference(fileId: string) {
  localStorage.removeItem(`demo_kv:file_ref:${fileId}`);
}

export function incrementDownloadCount(fileId: string) {
  const ref = getFileReference(fileId);
  if (ref) {
    ref.download_count++;
    storeFileReference(fileId, ref);
  }
}

// Sharing operations
export interface SharePermission {
  file_id: string;
  shared_with_user_id: string;
  shared_at: string;
}

export function storeSharePermission(fileId: string, userId: string) {
  const share: SharePermission = {
    file_id: fileId,
    shared_with_user_id: userId,
    shared_at: new Date().toISOString()
  };
  setLocalItem(`share:${fileId}:${userId}`, share);
}

export function getSharePermission(fileId: string, userId: string): SharePermission | null {
  return getLocalItem<SharePermission>(`share:${fileId}:${userId}`);
}

export function getAllSharedFiles(userId: string): DemoFileReference[] {
  const keys = getKeysWithPrefix('share:');
  const fileIds = new Set<string>();
  
  for (const key of keys) {
    const share = getLocalItem<SharePermission>(key);
    if (share && share.shared_with_user_id === userId) {
      fileIds.add(share.file_id);
    }
  }
  
  const files: DemoFileReference[] = [];
  for (const fileId of fileIds) {
    const ref = getFileReference(fileId);
    if (ref) {
      files.push(ref);
    }
  }
  
  return files;
}

// Get all users (for admin)
export function getAllUsers() {
  const keys = getKeysWithPrefix('user:');
  const users: any[] = [];
  
  for (const key of keys) {
    const user = getLocalItem(key);
    if (user) {
      users.push(user);
    }
  }
  
  return users;
}
