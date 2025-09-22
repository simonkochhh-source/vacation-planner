-- Test Photo Functionality
-- Run these tests to verify photo privacy and access controls work correctly

-- ===========================================
-- TEST 1: Check if policies are active
-- ===========================================

-- Should show RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'trip_photos';

-- Should show our new policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'trip_photos' 
ORDER BY policyname;

-- Should show storage policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
AND policyname LIKE '%photo%' OR policyname LIKE '%trip%'
ORDER BY policyname;

-- ===========================================
-- TEST 2: Test data setup (run as authenticated user)
-- ===========================================

-- Create a test public trip (if it doesn't exist)
INSERT INTO trips (id, name, description, privacy, owner_id, start_date, end_date, destinations)
VALUES (
    'test-public-trip-001',
    'Test Öffentliche Reise',
    'Eine Testreise für Photo-Tests',
    'public',
    auth.uid(),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    ARRAY[]::uuid[]
) ON CONFLICT (id) DO UPDATE SET
    privacy = 'public',
    name = 'Test Öffentliche Reise (Updated)';

-- Create a test destination for the trip
INSERT INTO destinations (id, name, location, category, trip_id, owner_id, start_date, end_date)
VALUES (
    'test-destination-001',
    'Test Destination',
    'Test Location',
    'sightseeing',
    'test-public-trip-001',
    auth.uid(),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 day'
) ON CONFLICT (id) DO UPDATE SET
    name = 'Test Destination (Updated)';

-- Create test photos with different privacy settings
INSERT INTO trip_photos (
    id, 
    trip_id, 
    destination_id, 
    user_id, 
    file_name, 
    file_size, 
    file_type, 
    storage_path, 
    caption, 
    privacy
) VALUES 
(
    'test-photo-public-001',
    'test-public-trip-001',
    'test-destination-001',
    auth.uid(),
    'test_public_photo.jpg',
    1024000,
    'image/jpeg',
    auth.uid()::text || '/test-public-trip-001/test-destination-001/test_public_photo.jpg',
    'Test Public Photo',
    'public'
),
(
    'test-photo-private-001',
    'test-public-trip-001',
    'test-destination-001',
    auth.uid(),
    'test_private_photo.jpg',
    1024000,
    'image/jpeg',
    auth.uid()::text || '/test-public-trip-001/test-destination-001/test_private_photo.jpg',
    'Test Private Photo',
    'private'
) ON CONFLICT (id) DO UPDATE SET
    privacy = EXCLUDED.privacy,
    caption = EXCLUDED.caption;

-- ===========================================
-- TEST 3: Test photo visibility (as authenticated user)
-- ===========================================

-- Should show both photos (own photos)
SELECT 
    id, 
    file_name, 
    privacy, 
    caption,
    'authenticated_user_own_photos' as test_case
FROM trip_photos 
WHERE trip_id = 'test-public-trip-001'
ORDER BY privacy;

-- Test public photos query (what the public gallery uses)
SELECT 
    tp.id,
    tp.file_name,
    tp.privacy,
    tp.caption,
    t.privacy as trip_privacy,
    'public_photos_from_public_trip' as test_case
FROM trip_photos tp
JOIN trips t ON t.id = tp.trip_id
WHERE tp.trip_id = 'test-public-trip-001'
AND tp.privacy = 'public'
AND t.privacy = 'public';

-- ===========================================
-- TEST 4: Test PhotoService methods
-- ===========================================

-- This simulates what PhotoService.getPublicPhotosForTrip() does
SELECT 
    tp.*,
    d.name as destination_name,
    d.location as destination_location,
    'photoservice_simulation' as test_case
FROM trip_photos tp
JOIN destinations d ON d.id = tp.destination_id
JOIN trips t ON t.id = tp.trip_id
WHERE tp.trip_id = 'test-public-trip-001'
AND tp.privacy = 'public'
AND t.privacy = 'public'
ORDER BY tp.taken_at DESC NULLS LAST, tp.created_at DESC;

-- ===========================================
-- TEST 5: Test URL generation
-- ===========================================

-- Test storage URL generation (what happens in PhotoService.getSupabasePublicUrl())
SELECT 
    id,
    file_name,
    storage_path,
    'https://your-project.supabase.co/storage/v1/object/public/trip-photos/' || storage_path as generated_url,
    'url_generation_test' as test_case
FROM trip_photos 
WHERE trip_id = 'test-public-trip-001'
AND privacy = 'public';

-- ===========================================
-- TEST 6: Performance test
-- ===========================================

-- Test query performance with indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM trip_photos tp
JOIN trips t ON t.id = tp.trip_id
WHERE tp.privacy = 'public' 
AND t.privacy = 'public';

-- ===========================================
-- CLEANUP (optional - run to remove test data)
-- ===========================================

/*
-- Uncomment to clean up test data
DELETE FROM trip_photos WHERE id IN ('test-photo-public-001', 'test-photo-private-001');
DELETE FROM destinations WHERE id = 'test-destination-001';
DELETE FROM trips WHERE id = 'test-public-trip-001';
*/