# Quick Start Guide

## Welcome to Secure File Vault! 🎉

This application is now **fully operational** and works entirely within your browser using Supabase in **client-side mode**.

✅ **No server setup required** - Everything runs in your browser!  
✅ **Full functionality** - All features work client-side  
✅ **Instant startup** - No deployment needed

## How to Get Started

### 1. Create Your Account

1. You'll see a login screen when you first access the app
2. Click on the **"Sign Up"** tab
3. Fill in:
   - **Name**: Your full name (e.g., "John Doe")
   - **Email**: Your email address (e.g., "john@example.com")
   - **Password**: Choose a secure password
   - **Create as admin account**: ✅ Check this box to get admin access
4. Click **"Sign Up"**

### 2. Sign In

1. After signup, switch to the **"Sign In"** tab
2. Enter your email and password
3. Click **"Sign In"**

### 3. Start Using the App!

Once signed in, you can:

#### Upload Files
- Drag and drop files into the upload area
- Or click to select files from your computer
- Add tags (optional): e.g., "work, project, 2024"
- Choose public or private
- Click "Upload"

#### View Your Files
- See all your uploaded files in "My Files"
- Download, share, or delete files
- Track download counts for public files

#### Search & Filter
- Click "Show Filters" to search files
- Filter by:
  - Filename
  - File type (MIME type)
  - Size range
  - Date range
  - Tags
  - Uploader name

#### View Statistics
- See your storage usage
- Track deduplication savings
- Monitor your quota (10 MB default)

#### Admin Panel (if you're an admin)
- View all system files
- See all users
- View analytics and charts
- Monitor system-wide statistics

## Key Features

### 🔄 Automatic File Deduplication
Upload the same file twice with different names? The system detects this and saves storage!

**Example:**
- You upload "report.pdf" (1 MB) → Uses 1 MB
- Someone else uploads the same content as "final-report.pdf" → Uses 0 MB additional!
- Both keep their own filename and settings
- System shows you saved 50% storage

### 🔍 Powerful Search
Find files instantly using multiple filters combined.

### 🔒 Smart Sharing
- **Public**: Anyone with the link can download
- **Private**: Only you can access
- **Share with specific users**: Enter their email

### 📊 Analytics
Track your storage usage, deduplication savings, and more!

### ⚡ Rate Limiting
- Maximum 2 requests per second (prevents accidental spam)
- If you see "Rate limit exceeded", just wait 1 second

### 💾 Storage Quota
- Default: 10 MB per user
- Upload within your quota
- See real-time usage in Statistics

## Testing Deduplication

Want to see deduplication in action?

1. Upload any file (e.g., "test.pdf")
2. Upload the **same file** again with a different name (e.g., "test-copy.pdf")
3. Check your statistics - you'll see:
   - 2 files uploaded
   - 1 deduplicated
   - Storage savings percentage increased!

## Tips for Best Experience

1. **Use descriptive filenames** - Makes files easier to find
2. **Add tags** - Helps with searching later
3. **Check statistics regularly** - Monitor your quota
4. **Create admin account** - Check the admin box during signup to access analytics

## Important Notes

### Architecture
This app uses:
- **Frontend**: React + TypeScript
- **Backend**: Supabase (PostgreSQL + Storage + Auth)
- **Mode**: Client-side (direct Supabase access)
- **Status**: Look for "Client-Side Mode Active" badge in the header!

### Data Storage
- Files stored in private Supabase storage bucket
- Metadata in PostgreSQL database
- All communications encrypted (HTTPS)

### Limitations
- **Prototype environment**: This is for demonstration/prototyping
- **Storage**: 10 MB per user (configurable)
- **Rate limit**: 2 requests/second (configurable)
- **Not for sensitive data**: Don't upload confidential/PII data

## Troubleshooting

### ~~"Failed to fetch" error~~ ✅ FIXED!
The app now runs entirely in client-side mode - no fetch errors! Look for the green "Client-Side Mode Active" badge.

### Upload fails
- Check you haven't exceeded your 10 MB quota
- Try smaller files
- Check your internet connection

### Can't see uploaded files
- Refresh the page
- Check "My Files" tab
- Clear filters if applied

### Admin panel not visible
- Make sure you checked "Create as admin account" during signup
- Sign out and create a new account with admin checked

## Next Steps

1. ✅ Create an admin account
2. ✅ Upload some test files
3. ✅ Try uploading the same file twice (see deduplication!)
4. ✅ Experiment with search and filters
5. ✅ Check out the admin panel (if admin)
6. ✅ Share files with others

## Need Help?

Check out the comprehensive documentation:
- **README.md** - Full setup guide
- **USAGE_GUIDE.md** - Detailed user manual
- **API_SPEC.md** - API documentation
- **ARCHITECTURE.md** - System design
- **TESTING.md** - Test procedures

## Have Fun! 🚀

You're all set to explore the Secure File Vault. Upload files, experiment with features, and see how deduplication saves storage space!

---

**Built for the BalkanID Full Stack Engineering Capstone Project**
