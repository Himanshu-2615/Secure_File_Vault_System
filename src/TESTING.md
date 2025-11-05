# Testing Guide - Secure File Vault

## Overview

This document provides comprehensive testing procedures to validate all features of the Secure File Vault system.

## Prerequisites

1. Application is running and accessible
2. You have access to a web browser (Chrome, Firefox, Safari recommended)
3. Test files prepared (see Test Data section below)

## Test Data Preparation

Create the following test files for comprehensive testing:

1. **test-image.png** - Any PNG image (~500 KB)
2. **test-document.pdf** - Any PDF file (~1 MB)
3. **test-text.txt** - A simple text file (~10 KB)
4. **duplicate-test.png** - Copy of test-image.png with different name
5. **large-file.zip** - File > 5 MB (for quota testing)

## Test Scenarios

### 1. User Authentication Tests

#### Test 1.1: Sign Up - New User
**Steps:**
1. Navigate to application URL
2. Click "Sign Up" tab
3. Enter:
   - Name: "Test User"
   - Email: "testuser@example.com"
   - Password: "SecurePass123!"
   - Leave "Admin" unchecked
4. Click "Sign Up"

**Expected Results:**
- ✅ Success message appears
- ✅ Form clears
- ✅ Remains on auth screen

#### Test 1.2: Sign Up - Admin User
**Steps:**
1. Navigate to application
2. Click "Sign Up" tab
3. Enter:
   - Name: "Admin User"
   - Email: "admin@example.com"
   - Password: "AdminPass123!"
   - Check "Create as admin account"
4. Click "Sign Up"

**Expected Results:**
- ✅ Success message appears
- ✅ Admin status acknowledged in signup

#### Test 1.3: Sign In - Valid Credentials
**Steps:**
1. Click "Sign In" tab
2. Enter valid credentials
3. Click "Sign In"

**Expected Results:**
- ✅ Success notification
- ✅ Redirected to main application
- ✅ Username displayed in header
- ✅ Upload section visible

#### Test 1.4: Sign In - Invalid Credentials
**Steps:**
1. Click "Sign In" tab
2. Enter invalid email/password
3. Click "Sign In"

**Expected Results:**
- ✅ Error message displayed
- ✅ Remains on login screen

#### Test 1.5: Sign Out
**Steps:**
1. Sign in successfully
2. Click "Sign Out" button in header

**Expected Results:**
- ✅ Redirected to login screen
- ✅ Success message
- ✅ Cannot access protected routes

### 2. File Upload Tests

#### Test 2.1: Single File Upload
**Steps:**
1. Sign in as test user
2. Navigate to Upload section
3. Click upload area
4. Select test-image.png
5. Click "Upload 1 File"

**Expected Results:**
- ✅ File appears in preview list
- ✅ Upload progress shown
- ✅ Success notification
- ✅ File appears in "My Files"
- ✅ Storage stats update

#### Test 2.2: Multiple File Upload
**Steps:**
1. Click upload area
2. Select multiple files (test-image.png, test-document.pdf, test-text.txt)
3. Click "Upload 3 Files"

**Expected Results:**
- ✅ All files shown in preview
- ✅ Individual file sizes displayed
- ✅ Success notification shows count
- ✅ All files appear in file list
- ✅ Storage increases correctly

#### Test 2.3: Drag & Drop Upload
**Steps:**
1. Open file explorer
2. Drag test-document.pdf to upload area
3. Release file
4. Click "Upload 1 File"

**Expected Results:**
- ✅ Drop zone highlights on drag over
- ✅ File added to preview
- ✅ Upload succeeds

#### Test 2.4: Upload with Tags
**Steps:**
1. Select test-image.png
2. Enter tags: "test, image, sample"
3. Click "Upload 1 File"
4. View file in "My Files"

**Expected Results:**
- ✅ Tags visible on file card
- ✅ Tags saved correctly
- ✅ Can search by tags

#### Test 2.5: Upload as Public
**Steps:**
1. Select test-text.txt
2. Check "Make files public"
3. Click "Upload 1 File"
4. View file in list

**Expected Results:**
- ✅ File shows "Public" badge
- ✅ File visible in admin panel (if admin)

#### Test 2.6: File Deduplication
**Steps:**
1. Upload test-image.png
2. Upload duplicate-test.png (same content, different name)
3. Check notification and storage stats

**Expected Results:**
- ✅ Second upload shows "deduplicated" notification
- ✅ "Deduplicated" badge on file
- ✅ Reference count shows 2
- ✅ Storage used only increases once
- ✅ Savings percentage increases

#### Test 2.7: Storage Quota Enforcement
**Steps:**
1. Note current storage usage
2. Attempt to upload large-file.zip (>5MB)
3. Observe result

**Expected Results:**
- ✅ Error message if quota exceeded
- ✅ Clear quota information in error
- ✅ No partial upload

### 3. File Management Tests

#### Test 3.1: View File List
**Steps:**
1. Navigate to "My Files" tab
2. Observe file cards

**Expected Results:**
- ✅ All uploaded files visible
- ✅ File metadata displayed (name, size, type, date)
- ✅ Uploader name shown
- ✅ Public/private status visible
- ✅ Tags displayed

#### Test 3.2: Download File
**Steps:**
1. Click download icon on any file
2. Wait for download URL generation

**Expected Results:**
- ✅ New tab opens or download starts
- ✅ File downloads correctly
- ✅ Download count increments (for public files)
- ✅ Success notification

#### Test 3.3: Delete Own File
**Steps:**
1. Click trash icon on a file you uploaded
2. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ File removed from list
- ✅ Success notification
- ✅ Storage stats update
- ✅ File removed from storage (if no other references)

#### Test 3.4: Cannot Delete Others' Files
**Steps:**
1. Sign in as different user
2. View files (if shared)
3. Attempt to delete

**Expected Results:**
- ✅ Delete button disabled or error shown
- ✅ Appropriate error message

#### Test 3.5: Delete Deduplicated File
**Steps:**
1. Upload file twice (different names)
2. Delete one copy
3. Check that other copy still exists
4. Check storage stats

**Expected Results:**
- ✅ One reference deleted
- ✅ Other reference remains accessible
- ✅ Reference count decrements
- ✅ File stays in storage
- ✅ Storage stats accurate

### 4. File Sharing Tests

#### Test 4.1: Make File Public
**Steps:**
1. Click share icon on private file
2. Click "Make Public"
3. Observe changes

**Expected Results:**
- ✅ Badge changes to "Public"
- ✅ Success notification
- ✅ Download counter appears
- ✅ File visible in admin panel (if applicable)

#### Test 4.2: Share with Specific User
**Steps:**
1. Click share icon
2. Enter another user's email
3. Click "Share with User"
4. Sign in as that user
5. Check file access

**Expected Results:**
- ✅ Share success notification
- ✅ Recipient can access file
- ✅ Recipient can download
- ✅ Recipient cannot delete

### 5. Search & Filter Tests

#### Test 5.1: Search by Filename
**Steps:**
1. Click "Show Filters"
2. Enter partial filename
3. Click "Search"

**Expected Results:**
- ✅ Only matching files shown
- ✅ Partial matches work
- ✅ Case-insensitive search

#### Test 5.2: Filter by MIME Type
**Steps:**
1. Show filters
2. Select "image/png" from dropdown
3. Search

**Expected Results:**
- ✅ Only PNG images shown
- ✅ Other file types filtered out

#### Test 5.3: Filter by Size Range
**Steps:**
1. Show filters
2. Set Min Size: 100000 (100 KB)
3. Set Max Size: 2000000 (2 MB)
4. Search

**Expected Results:**
- ✅ Only files in range shown
- ✅ Boundary values included

#### Test 5.4: Filter by Tags
**Steps:**
1. Show filters
2. Enter tags: "test, sample"
3. Search

**Expected Results:**
- ✅ Files with matching tags shown
- ✅ Works with multiple tags

#### Test 5.5: Combined Filters
**Steps:**
1. Show filters
2. Set filename, MIME type, and size
3. Search

**Expected Results:**
- ✅ All filters applied (AND logic)
- ✅ Results match all criteria

#### Test 5.6: Clear Filters
**Steps:**
1. Apply multiple filters
2. Click "Clear" button

**Expected Results:**
- ✅ All filter inputs cleared
- ✅ Full file list shown
- ✅ Filter UI resets

### 6. Storage Statistics Tests

#### Test 6.1: View Storage Stats
**Steps:**
1. Navigate to Statistics section
2. Observe displayed metrics

**Expected Results:**
- ✅ Storage quota progress bar
- ✅ Percentage used displayed
- ✅ Total files count
- ✅ Deduplicated files count
- ✅ Actual storage used
- ✅ Space saved amount
- ✅ Original size shown
- ✅ Savings percentage

#### Test 6.2: Stats Update After Upload
**Steps:**
1. Note current stats
2. Upload new file
3. Observe stats changes

**Expected Results:**
- ✅ File count increases
- ✅ Storage used increases
- ✅ Progress bar updates
- ✅ Updates happen automatically

#### Test 6.3: Stats Update After Deletion
**Steps:**
1. Note current stats
2. Delete a file
3. Observe stats changes

**Expected Results:**
- ✅ File count decreases
- ✅ Storage used decreases (if not deduplicated)
- ✅ Progress bar updates

### 7. Admin Panel Tests (Admin Users Only)

#### Test 7.1: Access Admin Panel
**Steps:**
1. Sign in as admin user
2. Click "Admin Panel" tab

**Expected Results:**
- ✅ Tab visible for admin
- ✅ Panel loads successfully
- ✅ Overview tab shown by default

#### Test 7.2: View System Statistics
**Steps:**
1. Navigate to Admin > Overview
2. Observe metrics

**Expected Results:**
- ✅ Total files displayed
- ✅ Total users count
- ✅ Total storage shown
- ✅ Total downloads count
- ✅ Charts render correctly

#### Test 7.3: View Charts
**Steps:**
1. Observe bar chart (Files by Uploader)
2. Observe pie chart (File Visibility)

**Expected Results:**
- ✅ Bar chart shows upload distribution
- ✅ Pie chart shows public/private ratio
- ✅ Charts interactive (tooltips)
- ✅ Data accurate

#### Test 7.4: View All Files
**Steps:**
1. Click "All Files" tab
2. Scroll through list

**Expected Results:**
- ✅ All system files listed
- ✅ Uploader details visible
- ✅ Download counts shown
- ✅ Deduplication status visible

#### Test 7.5: View All Users
**Steps:**
1. Click "Users" tab
2. Review user list

**Expected Results:**
- ✅ All users displayed
- ✅ Email and name shown
- ✅ Admin badges visible
- ✅ Storage usage per user
- ✅ Join dates displayed

#### Test 7.6: Non-Admin Cannot Access
**Steps:**
1. Sign in as non-admin user
2. Look for Admin Panel tab

**Expected Results:**
- ✅ Admin Panel tab not visible
- ✅ Direct URL access blocked (if applicable)

### 8. Rate Limiting Tests

#### Test 8.1: Normal Request Rate
**Steps:**
1. Upload files at normal pace (< 2 per second)
2. Observe responses

**Expected Results:**
- ✅ All requests succeed
- ✅ No rate limit errors

#### Test 8.2: Exceed Rate Limit
**Steps:**
1. Rapidly click upload multiple times
2. Make > 2 requests per second

**Expected Results:**
- ✅ Error message: "Rate limit exceeded"
- ✅ HTTP 429 status
- ✅ Clear error message
- ✅ Retry after 1 second succeeds

### 9. Error Handling Tests

#### Test 9.1: Invalid MIME Type
**Steps:**
1. Rename test-image.png to test-image.pdf
2. Attempt to upload

**Expected Results:**
- ✅ Warning logged (check console)
- ✅ Upload may proceed with warning
- ✅ Actual MIME type detected

#### Test 9.2: Network Error
**Steps:**
1. Disable network
2. Attempt any operation
3. Re-enable network

**Expected Results:**
- ✅ Error notification shown
- ✅ Console logs detailed error
- ✅ Can retry after network restored

#### Test 9.3: Session Expiry
**Steps:**
1. Sign in
2. Wait for session to expire (or manually clear)
3. Attempt operation

**Expected Results:**
- ✅ Redirect to login
- ✅ Appropriate error message
- ✅ Can sign in again

### 10. UI/UX Tests

#### Test 10.1: Responsive Design
**Steps:**
1. Resize browser window
2. Test mobile viewport (375px)
3. Test tablet viewport (768px)
4. Test desktop viewport (1920px)

**Expected Results:**
- ✅ Layout adapts to screen size
- ✅ No horizontal scroll
- ✅ All features accessible
- ✅ Text remains readable

#### Test 10.2: Drag & Drop Visual Feedback
**Steps:**
1. Drag file over upload zone
2. Observe styling changes

**Expected Results:**
- ✅ Border highlights on drag over
- ✅ Background color changes
- ✅ Clear visual feedback

#### Test 10.3: Loading States
**Steps:**
1. Observe loading indicators during:
   - File upload
   - File list loading
   - Stats loading

**Expected Results:**
- ✅ Spinner or skeleton shown
- ✅ Clear loading messages
- ✅ No flash of empty content

#### Test 10.4: Notifications
**Steps:**
1. Perform various actions
2. Observe toast notifications

**Expected Results:**
- ✅ Success toasts for successful actions
- ✅ Error toasts for failures
- ✅ Clear, actionable messages
- ✅ Auto-dismiss after appropriate time

## Performance Tests

### Test P.1: Large File List
**Steps:**
1. Upload 50+ files
2. Navigate to file list
3. Test scrolling and search

**Expected Results:**
- ✅ List loads within 2 seconds
- ✅ Smooth scrolling
- ✅ Search responsive

### Test P.2: Concurrent Uploads
**Steps:**
1. Select 10 files
2. Upload all at once
3. Monitor progress

**Expected Results:**
- ✅ All files processed
- ✅ No timeouts
- ✅ Correct final count

## Security Tests

### Test S.1: Cannot Access Other Users' Private Files
**Steps:**
1. User A uploads private file
2. User B attempts to download (direct URL if possible)

**Expected Results:**
- ✅ Access denied
- ✅ 403 Forbidden error

### Test S.2: SQL Injection Prevention
**Steps:**
1. Enter `'; DROP TABLE users; --` in search fields
2. Attempt other injection patterns

**Expected Results:**
- ✅ No database errors
- ✅ Input treated as literal string
- ✅ No data corruption

### Test S.3: XSS Prevention
**Steps:**
1. Upload file with name: `<script>alert('XSS')</script>.txt`
2. View in file list

**Expected Results:**
- ✅ Script does not execute
- ✅ Filename displayed as text
- ✅ Special characters escaped

## Regression Tests

After any code changes, re-run critical test scenarios:

1. ✅ Sign up and sign in
2. ✅ Upload single file
3. ✅ Upload duplicate file (deduplication)
4. ✅ Download file
5. ✅ Delete file
6. ✅ Search files
7. ✅ View statistics
8. ✅ Admin panel (if admin)

## Bug Reporting Template

When reporting issues, include:

```
**Bug Title:** Brief description

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
...

**Actual Result:**
...

**Browser/Environment:**
- Browser: Chrome 120
- OS: Windows 11
- Screen size: 1920x1080

**Console Errors:**
```
[paste console errors here]
```

**Screenshots:**
[attach screenshots]
```

## Test Results Checklist

Use this checklist to track test completion:

### Authentication
- [ ] 1.1: Sign Up - New User
- [ ] 1.2: Sign Up - Admin User
- [ ] 1.3: Sign In - Valid Credentials
- [ ] 1.4: Sign In - Invalid Credentials
- [ ] 1.5: Sign Out

### File Upload
- [ ] 2.1: Single File Upload
- [ ] 2.2: Multiple File Upload
- [ ] 2.3: Drag & Drop Upload
- [ ] 2.4: Upload with Tags
- [ ] 2.5: Upload as Public
- [ ] 2.6: File Deduplication
- [ ] 2.7: Storage Quota Enforcement

### File Management
- [ ] 3.1: View File List
- [ ] 3.2: Download File
- [ ] 3.3: Delete Own File
- [ ] 3.4: Cannot Delete Others' Files
- [ ] 3.5: Delete Deduplicated File

### File Sharing
- [ ] 4.1: Make File Public
- [ ] 4.2: Share with Specific User

### Search & Filter
- [ ] 5.1: Search by Filename
- [ ] 5.2: Filter by MIME Type
- [ ] 5.3: Filter by Size Range
- [ ] 5.4: Filter by Tags
- [ ] 5.5: Combined Filters
- [ ] 5.6: Clear Filters

### Storage Statistics
- [ ] 6.1: View Storage Stats
- [ ] 6.2: Stats Update After Upload
- [ ] 6.3: Stats Update After Deletion

### Admin Panel
- [ ] 7.1: Access Admin Panel
- [ ] 7.2: View System Statistics
- [ ] 7.3: View Charts
- [ ] 7.4: View All Files
- [ ] 7.5: View All Users
- [ ] 7.6: Non-Admin Cannot Access

### Rate Limiting
- [ ] 8.1: Normal Request Rate
- [ ] 8.2: Exceed Rate Limit

### Error Handling
- [ ] 9.1: Invalid MIME Type
- [ ] 9.2: Network Error
- [ ] 9.3: Session Expiry

### UI/UX
- [ ] 10.1: Responsive Design
- [ ] 10.2: Drag & Drop Visual Feedback
- [ ] 10.3: Loading States
- [ ] 10.4: Notifications

## Automated Testing (Future)

### Recommended Test Framework
- **Frontend**: Jest + React Testing Library
- **Backend**: Deno Test
- **E2E**: Playwright or Cypress

### Test Coverage Goals
- Unit Tests: 80%+
- Integration Tests: 70%+
- E2E Tests: Critical paths

## Continuous Testing

Schedule regular testing:
- **Pre-deployment**: Full test suite
- **Post-deployment**: Smoke tests
- **Weekly**: Regression tests
- **Monthly**: Performance tests

## Conclusion

Thorough testing ensures the Secure File Vault meets all requirements and provides a reliable, secure user experience. Use this guide to validate functionality before and after any changes.
