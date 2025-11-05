# System Architecture & Design

## Overview

The Secure File Vault is a production-grade file management system built on a three-tier architecture pattern, leveraging modern web technologies and cloud services for scalability, security, and performance.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React Application (TypeScript)                       │   │
│  │  - AuthForm, FileUpload, FileList                    │   │
│  │  - StorageStats, AdminPanel                          │   │
│  │  - UI Components (shadcn/ui)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Hono Web Server (Deno Edge Function)                │   │
│  │  - Rate Limiting Middleware                          │   │
│  │  - Authentication Middleware                         │   │
│  │  - File Upload/Download Handlers                     │   │
│  │  - Search & Filter Logic                             │   │
│  │  - Admin Routes                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  PostgreSQL  │  │   Supabase   │  │   Supabase   │       │
│  │  (KV Store)  │  │     Auth     │  │   Storage    │       │
│  │  - Metadata  │  │  - Users     │  │  - Files     │       │
│  │  - Quotas    │  │  - Sessions  │  │  - Buckets   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Architecture

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4.0
- **UI Components**: shadcn/ui component library
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Native Fetch API
- **Notifications**: Sonner toast library
- **Charts**: Recharts for data visualization

#### Component Hierarchy

```
App (Root)
├── AuthForm
│   ├── Tabs (Sign In / Sign Up)
│   ├── Input fields
│   └── Form validation
├── FileUpload
│   ├── Drag & Drop Zone
│   ├── File List Preview
│   └── Upload Progress
├── FileList
│   ├── Search Filters (Collapsible)
│   ├── File Grid/List View
│   └── File Actions (Download, Share, Delete)
├── StorageStats
│   ├── Quota Progress Bar
│   ├── Statistics Cards
│   └── Savings Metrics
└── AdminPanel
    ├── Overview (Charts)
    ├── All Files Table
    └── Users Management
```

#### State Management Strategy

- **Local State**: Component-level state for UI interactions
- **Derived State**: Computed from API responses
- **Refresh Trigger**: Counter-based refresh mechanism for data synchronization
- **Session State**: Managed by Supabase Auth

### 2. Backend Architecture

#### Technology Stack
- **Runtime**: Deno (Server-side JavaScript/TypeScript)
- **Web Framework**: Hono (lightweight, fast)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (private buckets)
- **Database**: PostgreSQL via Key-Value abstraction

#### API Design Principles

1. **RESTful Routes**: Resource-based URL structure
2. **Consistent Error Handling**: Standardized error responses
3. **Rate Limiting**: Request throttling per user
4. **Authentication**: Bearer token validation on all protected routes
5. **CORS**: Open CORS headers for development

#### Middleware Pipeline

```
Request
  ↓
CORS Middleware
  ↓
Logger Middleware
  ↓
Rate Limit Middleware (protected routes)
  ↓
Authentication Middleware (protected routes)
  ↓
Route Handler
  ↓
Response
```

### 3. Data Layer

#### Database Schema (Key-Value Store)

The system uses a key-value store abstraction over PostgreSQL:

**Key Patterns:**

1. **File Metadata**
   - Key: `file:{sha256_hash}`
   - Value: 
     ```typescript
     {
       hash: string,
       original_filename: string,
       mime_type: string,
       size: number,
       upload_date: ISO8601,
       uploader_id: UUID,
       uploader_name: string,
       storage_path: string,
       download_count: number
     }
     ```

2. **User File References**
   - Key: `user_files:{user_id}`
   - Value: Array of
     ```typescript
     {
       id: string,
       hash: string,
       filename: string,
       created_at: ISO8601,
       is_public: boolean,
       folder_id: string | null,
       tags: string[]
     }
     ```

3. **Reference Counter**
   - Key: `ref_count:{sha256_hash}`
   - Value: `number` (count of references to this file)

4. **User Quota**
   - Key: `quota:{user_id}`
   - Value:
     ```typescript
     {
       user_id: UUID,
       storage_used: number,
       storage_limit: number,
       rate_limit: number
     }
     ```

5. **Rate Limiting**
   - Key: `rate_limit:{user_id}`
   - Value:
     ```typescript
     {
       user_id: UUID,
       last_request_time: timestamp,
       request_count: number,
       rate_limit: number
     }
     ```

#### Storage Architecture

- **Bucket**: `make-7f2aa9ae-files` (private)
- **File Path**: `{sha256_hash}` (content-addressable storage)
- **Access**: Signed URLs with 1-hour expiry
- **Deduplication**: Only one copy per unique hash

## Key Algorithms

### 1. File Deduplication Algorithm

```
function uploadFile(file):
  1. Read file content as ArrayBuffer
  2. Validate MIME type against file signature
  3. Calculate SHA-256 hash of content
  
  4. Check if file:{hash} exists in database
  
  5. IF exists (duplicate):
       a. Create user reference with new filename
       b. Increment ref_count:{hash}
       c. Return {is_deduplicated: true}
  
  6. ELSE (new file):
       a. Check user storage quota
       b. Upload file to Supabase Storage
       c. Store file metadata in file:{hash}
       d. Create user reference
       e. Set ref_count:{hash} = 1
       f. Update user quota
       g. Return {is_deduplicated: false}
```

**Benefits:**
- Saves storage space (up to 100% for identical files)
- Reduces upload bandwidth for duplicates
- Maintains user-specific filenames and metadata

### 2. File Deletion Algorithm

```
function deleteFile(fileId, userId):
  1. Get user's file references
  2. Find reference by fileId
  
  3. Verify uploader_id matches userId
     IF NOT: return 403 Forbidden
  
  4. Remove reference from user_files:{userId}
  
  5. Decrement ref_count:{hash}
  
  6. IF ref_count <= 0:
       a. Delete file from Supabase Storage
       b. Delete file:{hash} metadata
       c. Delete ref_count:{hash}
       d. Update user storage quota
  
  7. ELSE:
       a. Keep file in storage (other users referencing)
  
  8. Return success with remaining references
```

**Benefits:**
- Prevents accidental data loss
- Ensures proper cleanup when no references remain
- Maintains referential integrity

### 3. Search & Filter Algorithm

```
function searchFiles(userId, filters):
  1. Get user_files:{userId}
  
  2. FOR EACH reference:
       a. Fetch file:{hash} metadata
       b. Combine reference + metadata
       c. Apply filters:
          - filename: case-insensitive substring match
          - mime_type: exact match
          - size_min/max: numeric range
          - date_from/to: date range
          - tags: all tags must be present
          - uploader_name: case-insensitive substring match
       d. IF passes all filters: include in results
  
  3. Return filtered results
```

**Optimization Opportunities:**
- Index frequently searched fields
- Cache filter results
- Implement pagination for large result sets

### 4. Rate Limiting Algorithm

```
function rateLimitCheck(userId, rateLimit):
  1. Get rate_limit:{userId} data
  
  2. IF data exists:
       a. Calculate time_diff = now - last_request_time
       b. IF time_diff < 1 second:
            i. Increment request_count
            ii. IF request_count > rateLimit:
                 RETURN 429 Too Many Requests
       c. ELSE:
            i. Reset request_count = 1
            ii. Update last_request_time = now
  
  3. ELSE:
       a. Initialize rate_limit data
  
  4. RETURN OK (proceed to handler)
```

**Benefits:**
- Prevents API abuse
- Protects server resources
- Configurable per user

## Security Architecture

### Authentication Flow

```
1. User submits credentials
   ↓
2. Supabase Auth validates
   ↓
3. JWT access token issued
   ↓
4. Frontend stores token in memory
   ↓
5. All API requests include: Authorization: Bearer {token}
   ↓
6. Backend validates token with Supabase
   ↓
7. Extract user ID from token
   ↓
8. Proceed with authorized request
```

### Authorization Model

- **File Access**: Users can access files they own or files shared with them
- **File Deletion**: Only the original uploader can delete
- **Admin Access**: Admins can view all files (read-only)
- **Quota Enforcement**: Server-side validation prevents quota bypass

### MIME Type Validation

Uses file signature (magic number) validation:

```typescript
// Example: PNG file signature
const signatures = {
  'image/png': [[0x89, 0x50, 0x4E, 0x47]]
};

function validateMimeType(buffer, declaredType):
  1. Get expected signatures for declaredType
  2. Read first N bytes of file
  3. Compare with known signatures
  4. IF match: return true
  5. ELSE: return false (reject upload)
```

**Validated Types:**
- PNG, JPEG, GIF images
- PDF documents
- ZIP archives

## Performance Considerations

### Frontend Optimizations

1. **Lazy Loading**: Components load on-demand
2. **Debounced Search**: Prevents excessive API calls during typing
3. **Optimistic Updates**: UI updates before server confirmation
4. **Memoization**: React.memo for expensive components
5. **Virtual Scrolling**: For large file lists (future enhancement)

### Backend Optimizations

1. **Content-Addressable Storage**: Files stored by hash, enabling instant deduplication
2. **Signed URLs**: Direct downloads bypass server, reducing load
3. **Indexed Lookups**: KV store provides O(1) key lookups
4. **Batch Operations**: Multiple file uploads processed in parallel
5. **Connection Pooling**: Supabase client reuses database connections

### Storage Optimizations

1. **Deduplication**: Eliminates redundant storage
2. **Compression**: Files compressed at rest (Supabase default)
3. **CDN Distribution**: Signed URLs can leverage CDN (future)

## Scalability Analysis

### Horizontal Scaling

- **Frontend**: Static files on CDN, infinite scale
- **Backend**: Serverless edge functions auto-scale
- **Database**: Managed PostgreSQL with connection pooling
- **Storage**: Object storage scales to petabytes

### Vertical Limits

- **KV Store**: PostgreSQL row limit (~billions)
- **File Size**: Limited by user quota (default 10MB)
- **Concurrent Users**: Limited by Supabase plan

### Bottlenecks

1. **KV Operations**: O(n) operations for user file lists
   - **Mitigation**: Implement pagination, caching
2. **Hash Computation**: CPU-intensive for large files
   - **Mitigation**: Web Workers for client-side hashing
3. **Search Queries**: Linear scan through file lists
   - **Mitigation**: Server-side indexes, full-text search

## Error Handling

### Frontend Strategy

- **Try-Catch Blocks**: Wrap async operations
- **Toast Notifications**: User-friendly error messages
- **Console Logging**: Detailed errors for debugging
- **Fallback UI**: Graceful degradation on errors

### Backend Strategy

- **Structured Errors**: Consistent JSON error format
- **HTTP Status Codes**: Semantic error codes (400, 401, 403, 404, 413, 429, 500)
- **Error Context**: Detailed messages with contextual information
- **Logging**: Console logs for server-side debugging

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)",
  "code": "ERROR_CODE (optional)"
}
```

## Monitoring & Observability

### Metrics to Track

1. **Upload Metrics**
   - Total uploads
   - Deduplication rate
   - Average file size
   - MIME type distribution

2. **Performance Metrics**
   - API response times
   - Upload throughput
   - Download throughput
   - Error rates

3. **Usage Metrics**
   - Active users
   - Storage consumption
   - Quota utilization
   - Rate limit violations

4. **Business Metrics**
   - Storage savings from deduplication
   - User growth rate
   - File growth rate

### Logging Strategy

- **Request Logging**: All API requests logged with timestamp, user, endpoint
- **Error Logging**: Errors logged with stack traces
- **Audit Logging**: File operations (upload, delete, share) logged for compliance

## Future Enhancements

### Short-term

1. **Folder Organization**: Hierarchical folder structure
2. **Batch Operations**: Multi-select delete, download
3. **Advanced Permissions**: Read/write permissions for shared files
4. **File Versioning**: Keep history of file changes
5. **Trash/Recycle Bin**: Soft delete with recovery

### Medium-term

1. **Full-Text Search**: Search within file contents
2. **Thumbnail Generation**: Preview images and PDFs
3. **File Encryption**: End-to-end encryption for sensitive files
4. **Audit Logs**: Complete history of file access
5. **Webhooks**: Notify external services of file events

### Long-term

1. **Collaborative Editing**: Real-time file collaboration
2. **Mobile Apps**: Native iOS and Android clients
3. **API Gateway**: Public API for third-party integrations
4. **Machine Learning**: Auto-tagging, duplicate detection improvements
5. **Blockchain**: Immutable file integrity verification

## Design Decisions & Rationale

### Why Key-Value Store over Relational Schema?

**Decision**: Use KV abstraction instead of traditional tables

**Rationale**:
- Faster development iteration
- Flexible schema evolution
- Simpler data access patterns
- Adequate for prototype phase
- Easy to migrate to relational later

**Trade-offs**:
- No complex queries (joins, aggregations)
- Manual referential integrity
- Limited transaction support

### Why SHA-256 for Deduplication?

**Decision**: Use SHA-256 cryptographic hash

**Rationale**:
- Collision probability: ~0% for practical purposes
- Fast computation (hardware accelerated)
- Industry standard, well-tested
- Fixed 256-bit output

**Alternatives Considered**:
- MD5: Too weak, collision attacks exist
- SHA-1: Deprecated, collision attacks demonstrated
- SHA-512: Overkill, larger output with minimal benefit

### Why Signed URLs for Downloads?

**Decision**: Generate time-limited signed URLs

**Rationale**:
- Offloads traffic from application server
- Leverages CDN capabilities
- Reduces bandwidth costs
- Better performance for end users

**Trade-offs**:
- Requires secure key management
- Limited time window (1 hour)
- Cannot revoke access mid-download

### Why Rate Limiting per User?

**Decision**: Implement per-user rate limiting (2 req/sec)

**Rationale**:
- Prevents individual user abuse
- Protects shared resources
- Maintains service quality for all users
- Configurable for different user tiers

**Alternative**: Global rate limiting would be simpler but unfair

## Conclusion

The Secure File Vault demonstrates a well-architected system with:
- Clear separation of concerns (three-tier architecture)
- Robust security measures (authentication, authorization, validation)
- Efficient storage (deduplication, content-addressable storage)
- Scalable design (serverless, managed services)
- Comprehensive feature set (upload, search, share, analytics)

The architecture balances simplicity for rapid development with production-ready patterns for reliability, security, and performance.
