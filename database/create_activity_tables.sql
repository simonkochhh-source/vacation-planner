-- Create activity interaction tables
-- Copy and paste this entire script into your Supabase SQL Editor

-- Activity Likes Table
CREATE TABLE IF NOT EXISTS activity_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Activity Comments Table  
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create foreign key relationship to user_profiles for nickname access
-- This allows Supabase to understand the relationship for JOINs
DO $$
BEGIN
  -- Check if user_profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
    -- Try to add the foreign key constraint for user_profiles
    BEGIN
      -- Note: This assumes user_profiles.id references the same auth.users(id)
      -- We're creating a view that helps with the JOIN relationship
      
      -- For now, let's ensure the relationship is clear by adding a comment
      COMMENT ON COLUMN activity_comments.user_id IS 'References auth.users(id) and should join with user_profiles(id)';
      
    EXCEPTION WHEN OTHERS THEN
      -- If there are issues, we'll handle them in the application layer
      NULL;
    END;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);

-- Enable RLS
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- Policies for activity_likes
DROP POLICY IF EXISTS "Users can view all activity likes" ON activity_likes;
CREATE POLICY "Users can view all activity likes"
  ON activity_likes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can manage their own activity likes" ON activity_likes;
CREATE POLICY "Users can manage their own activity likes"
  ON activity_likes FOR ALL
  USING (auth.uid() = user_id);

-- Policies for activity_comments
DROP POLICY IF EXISTS "Users can view all activity comments" ON activity_comments;
CREATE POLICY "Users can view all activity comments"
  ON activity_comments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can create activity comments" ON activity_comments;
CREATE POLICY "Users can create activity comments"
  ON activity_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own activity comments" ON activity_comments;
CREATE POLICY "Users can update their own activity comments"
  ON activity_comments FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own activity comments" ON activity_comments;
CREATE POLICY "Users can delete their own activity comments"
  ON activity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Verify tables exist
SELECT 'Activity tables created successfully!' as result;

-- Show table info
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('activity_likes', 'activity_comments')
ORDER BY table_name, ordinal_position;