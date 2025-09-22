-- Test Anonymous User Access to Public Photos
-- Run this test WITHOUT authentication (as anonymous user)

-- ===========================================
-- ANONYMOUS USER TESTS
-- ===========================================

-- TEST 1: Anonymous users should see public photos from public trips
SELECT 
    tp.id,
    tp.file_name,
    tp.privacy,
    tp.caption,
    tp.storage_path,
    'anonymous_public_photos' as test_case
FROM trip_photos tp
JOIN trips t ON t.id = tp.trip_id
WHERE tp.privacy = 'public'
AND t.privacy = 'public'
LIMIT 10;

-- TEST 2: Anonymous users should NOT see private photos (should return empty)
SELECT 
    tp.id,
    tp.file_name,
    tp.privacy,
    'anonymous_private_photos_should_be_empty' as test_case
FROM trip_photos tp
WHERE tp.privacy = 'private'
LIMIT 5;

-- TEST 3: Anonymous users should NOT see photos from private trips (should return empty)
SELECT 
    tp.id,
    tp.file_name,
    t.privacy as trip_privacy,
    'anonymous_private_trip_photos_should_be_empty' as test_case
FROM trip_photos tp
JOIN trips t ON t.id = tp.trip_id
WHERE t.privacy = 'private'
LIMIT 5;

-- TEST 4: Test the exact query used by PublicPhotoGallery component
-- This mirrors PhotoService.getPublicPhotosForTrip()
SELECT 
    tp.*,
    d.name as destination_name,
    d.location as destination_location,
    d.category as destination_category
FROM trip_photos tp
JOIN destinations d ON d.id = tp.destination_id  
JOIN trips t ON t.id = tp.trip_id
WHERE tp.trip_id = 'test-public-trip-001'  -- Replace with actual trip ID
AND tp.privacy = 'public'
AND t.privacy = 'public'
ORDER BY tp.taken_at DESC NULLS LAST, tp.created_at DESC;

-- TEST 5: Count total public photos available to anonymous users
SELECT 
    COUNT(*) as total_public_photos,
    COUNT(DISTINCT tp.trip_id) as public_trips_with_photos,
    'anonymous_summary_stats' as test_case
FROM trip_photos tp
JOIN trips t ON t.id = tp.trip_id
WHERE tp.privacy = 'public'
AND t.privacy = 'public';