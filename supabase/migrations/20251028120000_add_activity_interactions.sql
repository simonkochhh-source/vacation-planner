-- Add activity likes and comments tables for social activity feed interactions

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add foreign key to user_profiles if the table exists
  CONSTRAINT fk_activity_comments_user_profile 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

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