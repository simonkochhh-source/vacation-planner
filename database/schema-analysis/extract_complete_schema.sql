-- Complete Schema Analysis Script
-- This script extracts comprehensive schema information for comparison

-- 1. Get all tables and their columns
\echo '=== TABLES AND COLUMNS ==='
SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.column_default,
    c.is_nullable,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- 2. Get all constraints (Primary Keys, Foreign Keys, Unique, Check)
\echo '=== CONSTRAINTS ==='
SELECT 
    tc.constraint_schema,
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.match_option AS match_type,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name 
    AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 3. Get all indexes
\echo '=== INDEXES ==='
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Get all functions and procedures
\echo '=== FUNCTIONS AND PROCEDURES ==='
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 5. Get all triggers
\echo '=== TRIGGERS ==='
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. Get RLS policies
\echo '=== RLS POLICIES ==='
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Get table permissions and RLS status
\echo '=== TABLE PERMISSIONS AND RLS STATUS ==='
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'ENABLED'
        ELSE 'DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 8. Get storage buckets and policies (if available)
\echo '=== STORAGE BUCKETS ==='
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets;

\echo '=== STORAGE POLICIES ==='
SELECT 
    id,
    bucket_id,
    name,
    definition
FROM storage.policies;

-- 9. Get views
\echo '=== VIEWS ==='
SELECT 
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 10. Get sequences
\echo '=== SEQUENCES ==='
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;