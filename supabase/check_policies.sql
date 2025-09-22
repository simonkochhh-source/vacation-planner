-- Check if RLS policies are correctly set up for trip_photos

-- 1. Check if RLS is enabled on trip_photos table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'trip_photos';

-- 2. List all current policies on trip_photos table
SELECT 
    policyname as policy_name,
    roles as target_roles,
    cmd as command_type,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'trip_photos'
ORDER BY policyname;

-- 3. Check if privacy column exists and has correct constraints
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_photos' 
AND column_name IN ('privacy', 'privacy_approved_at')
ORDER BY column_name;

-- 4. Check table constraints (privacy check constraint)
SELECT 
    constraint_name,
    constraint_type,
    check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trip_photos';

-- 5. Check storage bucket policies
SELECT 
    policyname as policy_name,
    roles as target_roles,
    cmd as command_type
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%trip%' OR policyname LIKE '%photo%'
ORDER BY policyname;

-- 6. Test basic policy functionality with a simple query
-- This will show if policies are blocking or allowing access
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) 
FROM trip_photos 
WHERE privacy = 'public';

-- 7. Check indexes on trip_photos
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'trip_photos'
ORDER BY indexname;