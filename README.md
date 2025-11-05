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
