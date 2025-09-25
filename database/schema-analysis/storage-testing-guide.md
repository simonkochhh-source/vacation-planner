# Storage Configuration Testing & Verification Guide

**Date:** September 24, 2025  
**Purpose:** Complete testing checklist for storage bucket synchronization  
**Target Environment:** Dev Database (lsztvtauiapnhqplapgb.supabase.co)

## 🚀 Quick Start - Execute Storage Sync

### Method 1: Using the Complete Storage Sync Script
1. Navigate to [Supabase SQL Editor](https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new)
2. Copy and paste the entire content of `storage-sync.sql`
3. Execute the script
4. Verify the success message appears

### Method 2: Using the Updated Critical Dev Sync
1. Navigate to [Supabase SQL Editor](https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new)
2. Copy and paste the entire content of `critical-dev-sync.sql`
3. Execute the script
4. Verify: "CRITICAL DEV SYNC COMPLETED! OAuth and Storage are now configured."

## ✅ Verification Checklist

### 1. Storage Buckets Verification

**Run in SQL Editor:**
```sql
-- Verify all buckets were created
SELECT 
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
ORDER BY name;
```

**Expected Results:**
- ✅ `avatars` (public: true, limit: 5MB)
- ✅ `trip-photos` (public: true, limit: 10MB) 
- ✅ `destination-images` (public: true, limit: 10MB) *if using complete sync*
- ✅ `documents` (public: false, limit: 50MB) *if using complete sync*

### 2. Storage Policies Verification

**Run in SQL Editor:**
```sql
-- Verify storage policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;
```

**Expected Policies:**
- ✅ `avatar_upload_policy` (INSERT)
- ✅ `avatar_view_policy` (SELECT)
- ✅ `avatar_delete_policy` (DELETE)
- ✅ `trip_photo_upload_policy` (INSERT)
- ✅ `trip_photo_view_policy` (SELECT)
- ✅ `trip_photo_delete_policy` (DELETE)

### 3. Database Table Verification

**Run in SQL Editor:**
```sql
-- Verify trip_photos table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'trip_photos'
ORDER BY ordinal_position;
```

**Expected Columns:**
- ✅ `id` (UUID, PRIMARY KEY)
- ✅ `trip_id` (UUID, NOT NULL)
- ✅ `user_id` (UUID, NOT NULL)
- ✅ `file_name` (TEXT, NOT NULL)
- ✅ `file_size` (INTEGER, NOT NULL)
- ✅ `file_type` (TEXT, NOT NULL)
- ✅ `storage_path` (TEXT, NOT NULL, UNIQUE)
- ✅ `privacy` (VARCHAR with CHECK constraint)

### 4. RLS Policies Verification

**Run in SQL Editor:**
```sql
-- Verify trip_photos table policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    qual as using_condition,
    with_check
FROM pg_policies 
WHERE tablename = 'trip_photos'
ORDER BY policyname;
```

**Expected Table Policies:**
- ✅ `own_photos_select`
- ✅ `public_photos_select`
- ✅ `insert_own_photos`
- ✅ `update_own_photos`
- ✅ `delete_own_photos`

## 🧪 Functional Testing

### Test 1: Avatar Upload Flow

**Prerequisites:**
- User account created and authenticated
- Access to app's avatar upload component

**Test Steps:**
1. Navigate to user profile settings
2. Select avatar image (JPEG/PNG/WebP, < 5MB)
3. Upload image
4. Verify image appears in profile

**Verification:**
```sql
-- Check if files appear in avatar bucket
SELECT name, bucket_id, created_at, metadata->>'size' as file_size
FROM storage.objects 
WHERE bucket_id = 'avatars'
ORDER BY created_at DESC;
```

**Expected Path:** `/avatars/{user_id}/avatar.{ext}`

### Test 2: Trip Photo Upload Flow

**Prerequisites:**
- User has created at least one trip
- Access to app's photo upload component

**Test Steps:**
1. Navigate to trip details page
2. Upload photo to trip (< 10MB)
3. Add caption and location data
4. Verify photo appears in trip gallery

**Verification:**
```sql
-- Check trip photos in storage
SELECT name, bucket_id, created_at, metadata->>'size' as file_size
FROM storage.objects 
WHERE bucket_id = 'trip-photos'
ORDER BY created_at DESC;

-- Check trip_photos table entries
SELECT id, trip_id, file_name, caption, privacy, created_at
FROM trip_photos
ORDER BY created_at DESC;
```

**Expected Path:** `/trip-photos/{user_id}/{trip_id}/{photo_id}.{ext}`

### Test 3: Privacy Controls Testing

**Test Public Photo Access:**
1. Create public trip with public photos
2. Access photos while authenticated
3. Access photos while anonymous
4. Verify both work

**Test Private Photo Access:**
1. Create private trip with private photos
2. Try accessing as different user (should fail)
3. Try accessing as anonymous user (should fail)
4. Access as owner (should work)

**Verification Query:**
```sql
-- Test privacy policy logic
SELECT 
    tp.id,
    tp.privacy,
    t.privacy as trip_privacy,
    tp.user_id
FROM trip_photos tp
JOIN trips t ON tp.trip_id = t.id
WHERE tp.privacy = 'public' AND t.privacy = 'private'; -- Should return no rows
```

### Test 4: File Size and Type Restrictions

**Test File Size Limits:**
1. Try uploading avatar > 5MB (should fail)
2. Try uploading trip photo > 10MB (should fail)
3. Upload files within limits (should succeed)

**Test MIME Type Restrictions:**
1. Try uploading `.pdf` to avatars (should fail)
2. Try uploading `.txt` to trip-photos (should fail)
3. Upload valid image types (should succeed)

## 🔍 Performance Testing

### Database Performance Check

**Run these queries to test index performance:**

```sql
-- Test trip photo queries (should use indexes)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM trip_photos 
WHERE trip_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM trip_photos 
WHERE user_id = '123e4567-e89b-12d3-a456-426614174000'::uuid;

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM trip_photos 
WHERE privacy = 'public';
```

**Expected:** All queries should show "Index Scan" rather than "Seq Scan"

### Storage Performance Check

**Upload Speed Test:**
1. Upload 10 photos simultaneously
2. Monitor upload times
3. Verify all uploads complete successfully

**Download Speed Test:**
1. Request 20 photos from public trip
2. Monitor load times
3. Verify images display correctly

## ⚠️ Troubleshooting Common Issues

### Issue 1: "Invalid API Key" Error
**Solution:** Ensure you're using the service role key, not anon key for admin operations

### Issue 2: Storage Policies Not Working
**Solution:** 
1. Verify RLS is enabled: `SELECT * FROM storage.objects WHERE bucket_id = 'avatars';`
2. Check policy syntax in pg_policies table
3. Ensure user authentication is working

### Issue 3: File Upload Fails
**Possible Causes:**
- File exceeds size limit
- Unsupported MIME type
- Path doesn't match policy pattern
- User not authenticated

**Debug Query:**
```sql
-- Check recent policy violations
SELECT * FROM postgres_log 
WHERE message ILIKE '%policy%' 
ORDER BY log_time DESC 
LIMIT 10;
```

### Issue 4: Photos Not Visible
**Check:**
1. File actually uploaded to storage
2. Database entry created in trip_photos table
3. RLS policies allow access for current user
4. Trip privacy settings

## 📊 Monitoring Queries

### Storage Usage by Bucket
```sql
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(COALESCE((metadata->>'size')::bigint, 0)) as total_bytes,
    ROUND(SUM(COALESCE((metadata->>'size')::bigint, 0)) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects 
GROUP BY bucket_id
ORDER BY total_bytes DESC;
```

### Recent Upload Activity
```sql
SELECT 
    bucket_id,
    name,
    created_at,
    metadata->>'size' as file_size,
    metadata->>'mimetype' as mime_type
FROM storage.objects 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### User Photo Statistics
```sql
SELECT 
    u.email,
    up.nickname,
    COUNT(tp.id) as photo_count,
    MAX(tp.created_at) as last_upload
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN trip_photos tp ON u.id = tp.user_id
GROUP BY u.id, u.email, up.nickname
HAVING COUNT(tp.id) > 0
ORDER BY photo_count DESC;
```

## ✅ Success Criteria

Storage configuration is considered successful when:

- [x] All storage buckets exist and are properly configured
- [x] All storage policies are active and working
- [x] File uploads work through the application
- [x] Privacy controls function correctly
- [x] Database integration (trip_photos table) works
- [x] Performance is acceptable (< 5s for uploads, < 2s for displays)
- [x] File size and MIME type restrictions are enforced
- [x] RLS policies prevent unauthorized access

## 🎯 Next Steps After Successful Testing

1. **Production Sync:** Apply the same configuration to Production if needed
2. **CDN Setup:** Consider implementing CDN for faster image delivery
3. **Image Optimization:** Implement automatic image resizing/compression
4. **Backup Strategy:** Set up automated storage backups
5. **Monitoring:** Implement storage usage alerts and monitoring

---

**Testing Checklist Complete:** Once all items above are verified, your storage synchronization is complete and ready for production use.