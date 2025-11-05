export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface FileMetadata {
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

export interface FileReference {
  user_id: string;
  file_hash: string;
  filename: string;
  created_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
}

export interface FileShare {
  file_id: string;
  shared_with_user_id: string | null;
  is_public: boolean;
  created_at: string;
}

export interface StorageStats {
  total_storage_used: number;
  original_storage_usage: number;
  storage_savings: number;
  storage_savings_percentage: number;
  file_count: number;
  deduplicated_count: number;
}

export interface UserQuota {
  user_id: string;
  storage_used: number;
  storage_limit: number;
  rate_limit: number;
  last_request_time: number;
  request_count: number;
}

export interface SearchFilters {
  filename?: string;
  mime_type?: string;
  size_min?: number;
  size_max?: number;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  uploader_name?: string;
}
