-- ========================================
-- TRIGGER DIAGNOSTICS & REPAIR
-- ========================================
-- Diagnose why OAuth trigger is failing
-- Execute in Test DB: https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb/sql/new
-- ========================================

-- 1. CHECK TRIGGER EXISTS
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_create_user_profile';

-- 2. CHECK FUNCTION EXISTS
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_user_profile';

-- 3. CHECK TABLE EXISTS
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 4. CHECK RLS POLICIES
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
WHERE tablename = 'user_profiles';

-- 5. TEST MANUAL INSERT (should work)
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  -- Try direct insert
  BEGIN
    INSERT INTO user_profiles (id, email, nickname, display_name)
    VALUES (test_user_id, 'test@example.com', 'testuser', 'Test User');
    
    RAISE NOTICE 'SUCCESS: Manual insert works';
    
    -- Clean up
    DELETE FROM user_profiles WHERE id = test_user_id;
    
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'FAILED: Manual insert failed: %', SQLERRM;
  END;
END $$;

-- 6. CHECK auth.users STRUCTURE
SELECT 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 7. DETAILED FUNCTION INSPECTION
SELECT 
  p.proname AS function_name,
  p.prosrc AS function_body,
  p.prorettype::regtype AS return_type,
  p.proargtypes::regtype[] AS argument_types
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_user_profile' AND n.nspname = 'public';

-- 8. CHECK FOR ANY EXISTING USERS IN auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
LIMIT 5;

-- 9. FINAL STATUS SUMMARY
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  table_count INTEGER;
  policy_count INTEGER;
  user_count INTEGER;
BEGIN
  -- Count objects
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_create_user_profile';
  
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_name = 'create_user_profile';
  
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_name = 'user_profiles';
  
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles';
  
  SELECT COUNT(*) INTO user_count
  FROM auth.users;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 TRIGGER DIAGNOSTICS COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Trigger exists: % (should be 1)', trigger_count;
  RAISE NOTICE 'Function exists: % (should be 1)', function_count;
  RAISE NOTICE 'Table exists: % (should be 1)', table_count;
  RAISE NOTICE 'RLS policies: % (should be 4)', policy_count;
  RAISE NOTICE 'Users in auth.users: %', user_count;
  RAISE NOTICE '';
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '❌ TRIGGER MISSING - OAuth will fail';
  ELSIF function_count = 0 THEN
    RAISE NOTICE '❌ FUNCTION MISSING - OAuth will fail';
  ELSIF table_count = 0 THEN
    RAISE NOTICE '❌ TABLE MISSING - OAuth will fail';
  ELSE
    RAISE NOTICE '🤔 ALL OBJECTS EXIST - Error might be in function logic';
    RAISE NOTICE 'Check function body and test manual trigger execution';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;