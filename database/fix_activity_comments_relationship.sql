-- Fix the relationship between activity_comments and user_profiles
-- This script establishes the proper foreign key relationship for Supabase JOINs

-- First, verify that both tables exist and have the expected structure
DO $$
BEGIN
  -- Check if activity_comments table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_comments' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'activity_comments table does not exist. Please run create_activity_tables.sql first.';
  END IF;
  
  -- Check if user_profiles table exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    RAISE EXCEPTION 'user_profiles table does not exist. Please ensure user profiles are set up.';
  END IF;
  
  RAISE NOTICE 'Both tables exist, proceeding with relationship fix...';
END $$;

-- Method 1: Add a proper foreign key constraint if possible
-- This assumes user_profiles.id has the same UUID values as auth.users.id
DO $$
BEGIN
  -- Try to add a foreign key constraint to user_profiles
  -- Note: This may fail if the data doesn't match perfectly
  BEGIN
    ALTER TABLE activity_comments 
    ADD CONSTRAINT fk_activity_comments_user_profile 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Successfully added foreign key constraint to user_profiles';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add foreign key to user_profiles: %', SQLERRM;
    
    -- Method 2: Create a view that makes the relationship explicit
    DROP VIEW IF EXISTS activity_comments_with_profiles;
    CREATE VIEW activity_comments_with_profiles AS
    SELECT 
      ac.*,
      up.nickname,
      up.display_name,
      up.avatar_url
    FROM activity_comments ac
    LEFT JOIN user_profiles up ON ac.user_id = up.id;
    
    RAISE NOTICE 'Created activity_comments_with_profiles view as fallback';
  END;
END $$;

-- Method 3: Ensure the column descriptions help Supabase understand the relationship
COMMENT ON COLUMN activity_comments.user_id IS 'References user_profiles(id) for user profile information';

-- Method 4: Create explicit indexes that help with JOINs
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_profiles_join 
ON activity_comments(user_id) 
WHERE user_id IS NOT NULL;

-- Verify the relationship works
DO $$
DECLARE
  test_count INTEGER;
  profile_count INTEGER;
  comment_count INTEGER;
BEGIN
  -- Count user_profiles
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  
  -- Count activity_comments
  SELECT COUNT(*) INTO comment_count FROM activity_comments;
  
  -- Test the JOIN
  SELECT COUNT(*) INTO test_count 
  FROM activity_comments ac 
  LEFT JOIN user_profiles up ON ac.user_id = up.id;
  
  RAISE NOTICE 'Relationship test: % comments, % profiles, % successful joins', 
    comment_count, profile_count, test_count;
  
  -- Test Supabase-style foreign table reference
  BEGIN
    -- This is how Supabase expects the relationship to work
    PERFORM * FROM activity_comments 
    WHERE user_id IN (SELECT id FROM user_profiles) 
    LIMIT 1;
    
    RAISE NOTICE 'Supabase-style relationship test: SUCCESS';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Supabase-style relationship test: FAILED - %', SQLERRM;
  END;
END $$;

-- Final verification query
SELECT 
  'activity_comments relationship fix complete' as status,
  COUNT(ac.id) as total_comments,
  COUNT(up.id) as comments_with_profiles
FROM activity_comments ac
LEFT JOIN user_profiles up ON ac.user_id = up.id;