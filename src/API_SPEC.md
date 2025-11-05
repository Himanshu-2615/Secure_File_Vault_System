# Secure File Vault API Specification

## Base URL

```
https://{project-id}.supabase.co/functions/v1/make-server-7f2aa9ae
```

Replace `{project-id}` with your Supabase project ID.

## Authentication

All endpoints (except `/signup` and `/health`) require authentication via Bearer token.

### Request Headers

```http
Authorization: Bearer {access_token}
Content-Type: application/json
```

The access token is obtained after signing in via Supabase Auth.

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "details": "Additional context (optional)"
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `413 Payload Too Large` - Storage quota exceeded
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Endpoints

### Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Response:** `200 OK`

```json
{
  "status": "ok"
}
```

---

### User Signup

Create a new user account.

**Endpoint:** `POST /signup`

**Authentication:** Not required (uses public anon key)

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "is_admin": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | User password (min 6 characters) |
| name | string | Yes | User's display name |
| is_admin | boolean | No | Whether user should have admin privileges (default: false) |

**Response:** `200 OK`

```json
{
  "success": true,
  "user": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing required fields or invalid email format
- `409 Conflict` - Email already exists

---

### Get Current User Info

Retrieve information about the currently authenticated user.

**Endpoint:** `GET /user`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "id": "uuid-v4",
  "email": "user@example.com",
  "name": "John Doe",
  "is_admin": false,
  "created_at": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid or missing access token

---

### Upload Files

Upload one or more files to the vault.

**Endpoint:** `POST /upload`

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | Yes | One or more files to upload |
| tags | string (JSON array) | No | JSON-encoded array of tags, e.g., `["work","project"]` |
| folder_id | string | No | ID of folder to place files in |
| is_public | string | No | "true" to make files public, "false" for private (default) |

**cURL Example:**

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/upload \
  -H "Authorization: Bearer {access_token}" \
  -F "files=@/path/to/file1.pdf" \
  -F "files=@/path/to/file2.png" \
  -F 'tags=["work","important"]' \
  -F "is_public=false"
```

**Response:** `200 OK`

```json
{
  "success": true,
  "files": [
    {
      "id": "user-id:hash:timestamp",
      "hash": "sha256-hash-of-content",
      "filename": "document.pdf",
      "mime_type": "application/pdf",
      "size": 1048576,
      "upload_date": "2024-01-01T12:00:00Z",
      "uploader_id": "user-uuid",
      "uploader_name": "John Doe",
      "is_public": false,
      "folder_id": null,
      "tags": ["work", "important"],
      "storage_path": "sha256-hash",
      "download_count": 0,
      "is_deduplicated": false,
      "reference_count": 1
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - No files provided
- `413 Payload Too Large` - Storage quota exceeded
- `429 Too Many Requests` - Rate limit exceeded (2 req/sec)
- `500 Internal Server Error` - Upload failed

**Notes:**

- Files with identical content will be deduplicated automatically
- SHA-256 hash is computed for deduplication
- MIME type validation is performed
- Each file counts against user's storage quota

---

### Get Files

Retrieve a list of files for the authenticated user with optional filters.

**Endpoint:** `GET /files`

**Authentication:** Required

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| filename | string | Filter by filename (partial match, case-insensitive) | `filename=report` |
| mime_type | string | Filter by exact MIME type | `mime_type=application/pdf` |
| size_min | integer | Minimum file size in bytes | `size_min=100000` |
| size_max | integer | Maximum file size in bytes | `size_max=5000000` |
| date_from | string | Filter files uploaded after this date (ISO 8601) | `date_from=2024-01-01` |
| date_to | string | Filter files uploaded before this date (ISO 8601) | `date_to=2024-12-31` |
| tags | string | Comma-separated list of tags (any match) | `tags=work,project` |
| uploader_name | string | Filter by uploader name (partial match) | `uploader_name=john` |

**Example Request:**

```
GET /files?filename=report&mime_type=application/pdf&size_min=100000&tags=work
```

**Response:** `200 OK`

```json
{
  "files": [
    {
      "id": "file-reference-id",
      "hash": "sha256-hash",
      "filename": "annual-report.pdf",
      "mime_type": "application/pdf",
      "size": 2048576,
      "upload_date": "2024-01-15T10:30:00Z",
      "uploader_id": "user-uuid",
      "uploader_name": "John Doe",
      "is_public": false,
      "folder_id": null,
      "tags": ["work", "annual", "2024"],
      "storage_path": "sha256-hash",
      "download_count": 5,
      "is_deduplicated": true,
      "reference_count": 3
    }
  ]
}
```

**Notes:**

- All filters use AND logic (all conditions must be met)
- Empty filters object returns all user's files
- Results are not paginated (consider pagination for large datasets)

---

### Download File

Get a signed URL to download a specific file.

**Endpoint:** `GET /download/:fileId`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fileId | string | The unique file reference ID |

**Response:** `200 OK`

```json
{
  "download_url": "https://storage.supabase.co/...[signed-url]",
  "filename": "document.pdf",
  "mime_type": "application/pdf",
  "size": 1048576
}
```

**Error Responses:**

- `403 Forbidden` - User doesn't have access to this file
- `404 Not Found` - File not found
- `500 Internal Server Error` - Failed to generate download URL

**Notes:**

- Signed URL expires after 1 hour
- Download count is incremented for public files
- Access is granted to:
  - File owner
  - Users with whom the file is shared
  - Any user (if file is public)

---

### Delete File

Delete a file reference. If this is the last reference, the file is removed from storage.

**Endpoint:** `DELETE /files/:fileId`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fileId | string | The unique file reference ID |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Responses:**

- `403 Forbidden` - Only the uploader can delete files
- `404 Not Found` - File not found

**Notes:**

- Only the original uploader can delete their file reference
- If the file is deduplicated (referenced by multiple users), only this reference is deleted
- When the last reference is deleted, the file is permanently removed from storage
- Storage quota is adjusted accordingly

---

### Get Storage Statistics

Retrieve storage usage and deduplication statistics for the authenticated user.

**Endpoint:** `GET /stats`

**Authentication:** Required

**Response:** `200 OK`

```json
{
  "storage_used": 5242880,
  "storage_limit": 10485760,
  "total_storage_used": 3145728,
  "original_storage_usage": 7340032,
  "storage_savings": 4194304,
  "storage_savings_percentage": 57.14,
  "file_count": 15,
  "deduplicated_count": 5
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| storage_used | integer | Total bytes counted against user's quota |
| storage_limit | integer | Maximum bytes allowed for user |
| total_storage_used | integer | Actual bytes stored (after deduplication) |
| original_storage_usage | integer | Bytes if no deduplication |
| storage_savings | integer | Bytes saved through deduplication |
| storage_savings_percentage | float | Percentage of space saved |
| file_count | integer | Total number of file references |
| deduplicated_count | integer | Number of deduplicated file references |

---

### Share File

Share a file publicly or with a specific user.

**Endpoint:** `POST /share`

**Authentication:** Required

**Request Body:**

```json
{
  "file_id": "file-reference-id",
  "is_public": true,
  "shared_with_user_email": "recipient@example.com"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file_id | string | Yes | ID of file to share |
| is_public | boolean | No | Make file publicly accessible |
| shared_with_user_email | string | No | Email of user to share with |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "File shared successfully"
}
```

**Error Responses:**

- `403 Forbidden` - Only the uploader can share files
- `404 Not Found` - File or user not found

**Notes:**

- `is_public: true` makes the file downloadable by anyone
- `shared_with_user_email` grants access to a specific user
- Both options can be used together

---

## Admin Endpoints

These endpoints require admin privileges (`is_admin: true`).

### Get All Files (Admin)

Retrieve all files in the system.

**Endpoint:** `GET /admin/files`

**Authentication:** Required (Admin only)

**Response:** `200 OK`

```json
{
  "files": [
    {
      "id": "file-reference-id",
      "hash": "sha256-hash",
      "filename": "document.pdf",
      "mime_type": "application/pdf",
      "size": 1048576,
      "upload_date": "2024-01-01T12:00:00Z",
      "uploader_id": "user-uuid",
      "uploader_name": "John Doe",
      "is_public": false,
      "folder_id": null,
      "tags": ["work"],
      "storage_path": "sha256-hash",
      "download_count": 10,
      "is_deduplicated": true,
      "reference_count": 2
    }
  ]
}
```

**Error Responses:**

- `403 Forbidden` - User is not an admin

---

### Get All Users (Admin)

Retrieve all users with their storage statistics.

**Endpoint:** `GET /admin/users`

**Authentication:** Required (Admin only)

**Response:** `200 OK`

```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "is_admin": false,
      "created_at": "2024-01-01T12:00:00Z",
      "storage_used": 5242880,
      "storage_limit": 10485760
    }
  ]
}
```

**Error Responses:**

- `403 Forbidden` - User is not an admin

---

## Rate Limiting

### Default Limits

- **Rate**: 2 requests per second per user
- **Window**: 1 second rolling window

### Rate Limit Response

When rate limit is exceeded:

**Response:** `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded. Maximum 2 requests per second."
}
```

### Rate Limit Headers (Future Enhancement)

```http
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640000001
```

---

## Webhooks (Future Enhancement)

Future versions may support webhooks for events like:

- `file.uploaded` - New file uploaded
- `file.deleted` - File deleted
- `file.downloaded` - File downloaded
- `user.created` - New user registered
- `storage.quota_exceeded` - User exceeded storage quota

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Upload file
const formData = new FormData();
formData.append('files', fileInput.files[0]);
formData.append('tags', JSON.stringify(['work', 'project']));
formData.append('is_public', 'false');

const response = await fetch(
  'https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/upload',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData
  }
);

const data = await response.json();
console.log('Uploaded:', data.files);
```

### Python

```python
import requests

# Upload file
files = {'files': open('document.pdf', 'rb')}
data = {
    'tags': '["work","project"]',
    'is_public': 'false'
}
headers = {
    'Authorization': f'Bearer {access_token}'
}

response = requests.post(
    'https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/upload',
    headers=headers,
    files=files,
    data=data
)

print(response.json())
```

### cURL

```bash
# Get files with filters
curl -X GET \
  "https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/files?filename=report&mime_type=application/pdf" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Download file
curl -X GET \
  "https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/download/file-id" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

# Delete file
curl -X DELETE \
  "https://your-project.supabase.co/functions/v1/make-server-7f2aa9ae/files/file-id" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"
```

---

## OpenAPI Specification

A machine-readable OpenAPI 3.0 specification is available at:

```
/openapi.yaml
```

You can import this into tools like:
- Postman
- Insomnia
- Swagger UI
- ReDoc

---

## Versioning

Current API version: **v1**

API version is not currently included in the URL. Breaking changes will be communicated via:
- Release notes
- Email notifications
- In-app announcements

---

## Support

For API issues or questions:
1. Check this documentation
2. Review error messages in response
3. Check server logs (admin access required)
4. Contact support team

---

## Changelog

### v1.0.0 (2024-01-01)
- Initial API release
- File upload with deduplication
- File management (download, delete)
- Search and filtering
- Storage statistics
- Sharing functionality
- Admin endpoints
- Rate limiting

---

## Best Practices

### Performance

1. **Batch Operations**: Upload multiple files in one request
2. **Caching**: Cache file lists and stats on client
3. **Pagination**: Request only what you need (consider implementing pagination)
4. **Compression**: Use gzip for large payloads

### Security

1. **HTTPS Only**: Always use HTTPS in production
2. **Token Security**: Never expose access tokens
3. **Input Validation**: Validate all input on client-side
4. **File Scanning**: Scan files for malware before upload (client responsibility)

### Reliability

1. **Error Handling**: Always handle errors gracefully
2. **Retries**: Implement exponential backoff for failed requests
3. **Timeouts**: Set appropriate request timeouts
4. **Idempotency**: Design operations to be safe to retry

---

This API specification is subject to change. Always refer to the latest version in the documentation.
