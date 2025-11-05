# Secure File Vault

A production-grade file vault system with advanced features including file deduplication, powerful search, controlled sharing, and comprehensive analytics.

## 🚀 Features

### Core Functionality

- **File Deduplication**: Uses SHA-256 hashing to detect duplicate content and store only references, saving storage space
- **Multi-File Upload**: Support for single and multiple file uploads with drag-and-drop interface
- **MIME Type Validation**: Validates file content against declared MIME type to prevent mismatched uploads
- **Advanced Search & Filtering**: Search by filename, MIME type, size range, date range, tags, and uploader name
- **File Sharing**: Share files publicly or with specific users
- **Rate Limiting**: Per-user API rate limits (default: 2 calls/second, configurable)
- **Storage Quotas**: Per-user storage limits (default: 10 MB, configurable)
- **Admin Panel**: Comprehensive analytics, user management, and system-wide file overview

### Security Features

- **User Authentication**: Secure signup and login with Supabase Auth
- **Access Control**: Only file uploaders can delete their files
- **Reference Counting**: Deduplicated files respect reference counts before deletion
- **Rate Limiting**: Prevents API abuse with configurable per-user limits
- **Storage Quotas**: Enforces per-user storage limits

### Analytics & Statistics

- **Storage Statistics**: View total storage used, original usage, and savings from deduplication
- **Download Tracking**: Track download counts for public files
- **Admin Dashboard**: Visualize file distribution, user activity, and system-wide metrics with charts

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Supabase (PostgreSQL, Edge Functions with Hono)
- **Storage**: Supabase Storage (private buckets)
- **Authentication**: Supabase Auth
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization

### Architecture Pattern

Three-tier architecture:
```
Frontend (React) → Server (Hono on Supabase Edge Functions) → Database (PostgreSQL via KV Store)
```

### Database Schema

The system uses a key-value store with the following keys:

- `file:{hash}` - File metadata (hash, filename, MIME type, size, uploader info, storage path)
- `user_files:{userId}` - Array of file references for each user
- `ref_count:{hash}` - Reference count for deduplicated files
- `quota:{userId}` - Storage quota and usage for each user
- `rate_limit:{userId}` - Rate limiting data for each user

### File Deduplication Strategy

1. Calculate SHA-256 hash of file content on upload
2. Check if hash exists in database
3. If exists: Create reference instead of storing duplicate file
4. If new: Upload to Supabase Storage and create metadata
5. Track reference count for proper deletion handling

## 📋 Setup Instructions

### Prerequisites

- Node.js 18+ 
- Supabase account
- Modern web browser

### Installation

1. **Clone the repository** (in a real deployment scenario)
   ```bash
   git clone <repository-url>
   cd secure-file-vault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   
   The application is pre-configured to use Supabase. The connection details are in `/utils/supabase/info.tsx`.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173` (or the URL provided by your dev server)

### First Time Setup

1. **Create an account**
   - Click on "Sign Up" tab
   - Enter your name, email, and password
   - Optionally check "Create as admin account" to get admin privileges
   - Click "Sign Up"

2. **Sign in**
   - Switch to "Sign In" tab
   - Enter your credentials
   - Click "Sign In"

3. **Start uploading files**
   - Navigate to the "Upload" tab
   - Drag and drop files or click to select
   - Add tags (optional)
   - Choose public/private visibility
   - Click "Upload"

## 📖 API Documentation

### Authentication

All API endpoints (except `/signup`) require authentication via Bearer token.

**Headers**:
```
Authorization: Bearer <access_token>
```

### Endpoints

#### POST `/make-server-7f2aa9ae/signup`
Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "is_admin": false
}
```

**Response**: `201 Created`
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    ...
  }
}
```

#### POST `/make-server-7f2aa9ae/upload`
Upload one or more files with optional metadata.

**Request**: `multipart/form-data`
- `files`: File[] - Array of files to upload
- `tags`: string (JSON array) - Optional tags
- `folder_id`: string - Optional folder ID
- `is_public`: boolean - Public visibility flag

**Response**: `201 Created`
```json
{
  "success": true,
  "files": [
    {
      "filename": "example.pdf",
      "hash": "sha256hash...",
      "size": 12345,
      "mime_type": "application/pdf",
      "is_deduplicated": false
    }
  ],
  "message": "Successfully uploaded 1 file(s)"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid MIME type or missing files
- `413 Payload Too Large`: Storage quota exceeded
- `429 Too Many Requests`: Rate limit exceeded

#### GET `/make-server-7f2aa9ae/files`
List files with optional filtering.

**Query Parameters**:
- `filename`: string - Filter by filename (partial match)
- `mime_type`: string - Filter by exact MIME type
- `size_min`: number - Minimum file size in bytes
- `size_max`: number - Maximum file size in bytes
- `date_from`: string (ISO date) - Filter files uploaded after this date
- `date_to`: string (ISO date) - Filter files uploaded before this date
- `tags`: string (comma-separated) - Filter by tags
- `uploader_name`: string - Filter by uploader name (partial match)

**Response**: `200 OK`
```json
{
  "files": [
    {
      "id": "unique-file-id",
      "hash": "sha256hash...",
      "filename": "example.pdf",
      "mime_type": "application/pdf",
      "size": 12345,
      "upload_date": "2024-01-01T12:00:00Z",
      "uploader_id": "user-uuid",
      "uploader_name": "John Doe",
      "is_public": false,
      "folder_id": null,
      "tags": ["work", "project"],
      "download_count": 5,
      "is_deduplicated": true,
      "reference_count": 3
    }
  ]
}
```

#### GET `/make-server-7f2aa9ae/download/:fileId`
Get a signed URL for downloading a file.

**Response**: `200 OK`
```json
{
  "download_url": "https://...",
  "filename": "example.pdf",
  "mime_type": "application/pdf"
}
```

#### DELETE `/make-server-7f2aa9ae/files/:fileId`
Delete a file (only by the uploader).

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "File deleted successfully",
  "references_remaining": 0
}
```

**Error Responses**:
- `403 Forbidden`: Only the uploader can delete the file
- `404 Not Found`: File not found

#### GET `/make-server-7f2aa9ae/stats`
Get storage statistics for the current user.

**Response**: `200 OK`
```json
{
  "total_storage_used": 1024000,
  "original_storage_usage": 2048000,
  "storage_savings": 1024000,
  "storage_savings_percentage": 50.0,
  "file_count": 10,
  "deduplicated_count": 3,
  "storage_limit": 10485760,
  "storage_used": 1024000
}
```

#### POST `/make-server-7f2aa9ae/share`
Share a file publicly or with a specific user.

**Request Body**:
```json
{
  "file_id": "unique-file-id",
  "is_public": true,
  "shared_with_user_email": "recipient@example.com"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "message": "File made public"
}
```

#### GET `/make-server-7f2aa9ae/admin/files`
(Admin only) Get all files in the system.

**Response**: `200 OK`
```json
{
  "files": [...]
}
```

#### GET `/make-server-7f2aa9ae/admin/users`
(Admin only) Get all users with their storage statistics.

**Response**: `200 OK`
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "is_admin": false,
      "created_at": "2024-01-01T12:00:00Z",
      "storage_used": 1024000,
      "storage_limit": 10485760
    }
  ]
}
```

## 🎯 Usage Guide

### Uploading Files

1. Navigate to the "Upload" tab
2. Drag and drop files or click to select multiple files
3. (Optional) Add tags separated by commas
4. (Optional) Check "Make files public" for public sharing
5. Click "Upload X Files"

**Deduplication**: If you upload a file that already exists in the system (same content), it will be automatically deduplicated and you'll see a notification.

### Managing Files

1. Navigate to the "My Files" tab
2. Use the "Show Filters" button to access advanced search
3. Apply filters and click "Search"
4. For each file, you can:
   - **Download**: Click the download icon
   - **Share**: Click the share icon to make public or share with specific users
   - **Delete**: Click the trash icon (only if you're the uploader)

### Viewing Statistics

1. Navigate to the "Statistics" tab
2. View:
   - Storage quota usage
   - Total files and deduplicated files
   - Actual storage vs. original storage
   - Space saved through deduplication

### Admin Panel (Admin Users Only)

1. Navigate to the "Admin Panel" tab
2. **Overview**: View system-wide statistics and charts
   - Total files, users, storage, and downloads
   - Files by uploader (bar chart)
   - File visibility distribution (pie chart)
3. **All Files**: Browse all files in the system with detailed metadata
4. **Users**: View all users with their storage usage

## 🔒 Security Considerations

### Rate Limiting

- Default: 2 API calls per second per user
- Configurable per user in the quota system
- Returns 429 status code when exceeded

### Storage Quotas

- Default: 10 MB per user
- Configurable per user
- Returns 413 status code when exceeded

### File Validation

- MIME type validation prevents file type mismatches
- Content is verified against declared type using file signatures (magic numbers)

### Access Control

- Users can only delete files they uploaded
- File references are tracked to prevent data loss
- Admin users have read-only access to all files

## 🧪 Testing

### Manual Testing Checklist

- [ ] User signup and login
- [ ] File upload (single file)
- [ ] File upload (multiple files)
- [ ] Drag and drop upload
- [ ] File deduplication (upload same file twice)
- [ ] Search and filtering
- [ ] File download
- [ ] File sharing (public)
- [ ] File sharing (with specific user)
- [ ] File deletion
- [ ] Storage statistics
- [ ] Rate limiting (rapid API calls)
- [ ] Storage quota enforcement
- [ ] Admin panel access (admin users)

## 📊 Performance Considerations

### Deduplication

- SHA-256 hashing is performed on the client side before upload
- Duplicate detection happens before file transfer, saving bandwidth
- Reference counting ensures efficient storage management

### Scalability

- Indexed key-value store for fast lookups
- Signed URLs for direct file downloads (bypassing server)
- Rate limiting prevents abuse
- Storage quotas prevent resource exhaustion

## 🐛 Troubleshooting

### "Rate limit exceeded" error

**Solution**: Wait 1 second before making the next request. Admin can increase your rate limit.

### "Storage quota exceeded" error

**Solution**: Delete some files or contact admin to increase your quota.

### "Invalid MIME type" error

**Solution**: The file extension doesn't match the actual file content. Ensure files haven't been renamed with incorrect extensions.

### Upload fails silently

**Solution**: Check browser console for detailed error messages. Ensure you're authenticated and have sufficient quota.

### Files not appearing after upload

**Solution**: Refresh the page or wait a moment for the statistics to update. Check the "My Files" tab.

## 🔧 Configuration

### Changing Default Quotas

Edit the constants in `/supabase/functions/server/index.tsx`:

```typescript
const DEFAULT_RATE_LIMIT = 2; // requests per second
const DEFAULT_STORAGE_LIMIT = 10 * 1024 * 1024; // 10 MB in bytes
```

### Adding MIME Type Validation

Add signatures to the `signatures` object in the `validateMimeType` function:

```typescript
const signatures: Record<string, number[][]> = {
  'your/mime-type': [[0xAA, 0xBB, 0xCC, 0xDD]], // File signature bytes
  // ...
};
```

## 📝 Code Documentation

### Frontend Components

- **AuthForm**: Handles user authentication (signup/signin)
- **FileUpload**: Drag-and-drop file upload with tag support
- **FileList**: Display and manage user files with advanced filtering
- **StorageStats**: Visualize storage usage and deduplication savings
- **AdminPanel**: Admin dashboard with analytics and user management

### Backend Routes

- **Rate Limiting Middleware**: Enforces per-user API rate limits
- **Upload Handler**: Processes file uploads with deduplication
- **File Management**: CRUD operations for files
- **Statistics**: Aggregates storage and usage metrics
- **Admin Routes**: System-wide data access for administrators

### Utility Functions

- **calculateHash**: Computes SHA-256 hash for file content
- **validateMimeType**: Validates file content against declared MIME type
- **formatBytes**: Human-readable file size formatting
- **formatDate**: Consistent date formatting across the app

## 🎨 Design Decisions

### Why KV Store?

The key-value store provides:
- Simple, flexible schema
- Fast lookups by key
- Easy to prototype and iterate
- Suitable for file metadata storage

### Why SHA-256 for Deduplication?

- Industry-standard cryptographic hash
- Extremely low collision probability
- Fast computation
- Fixed-length output (256 bits)

### Why Supabase?

- Built-in authentication
- PostgreSQL database
- File storage with signed URLs
- Edge functions for backend logic
- Automatic API generation

## 📄 License

This is a capstone project for educational purposes.

## 👥 Support

For issues or questions, please refer to the troubleshooting section or contact the development team.

---

**Built with React, TypeScript, Supabase, and shadcn/ui**
