-- Add activity likes and comments tables for social activity feed interactions
-- This migration adds support for liking and commenting on activity feed posts

-- Activity Likes Table
CREATE TABLE IF NOT EXISTS activity_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT NOT NULL, -- references user_activities.id but as TEXT due to mixed ID types
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each user can only like an activity once
  UNIQUE(activity_id, user_id)
);

-- Activity Comments Table
CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id TEXT NOT NULL, -- references user_activities.id but as TEXT due to mixed ID types
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_created_at ON activity_likes(created_at);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at);

-- Enable RLS
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_likes
CREATE POLICY "Users can view all activity likes"
  ON activity_likes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own activity likes"
  ON activity_likes FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for activity_comments
CREATE POLICY "Users can view all activity comments"
  ON activity_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create activity comments"
  ON activity_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity comments"
  ON activity_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity comments"
  ON activity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Update function for activity_comments
CREATE OR REPLACE FUNCTION update_activity_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating updated_at on activity_comments
DROP TRIGGER IF EXISTS trigger_update_activity_comments_updated_at ON activity_comments;
CREATE TRIGGER trigger_update_activity_comments_updated_at
  BEFORE UPDATE ON activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_comments_updated_at();

-- Grant permissions
GRANT ALL ON activity_likes TO authenticated;
GRANT ALL ON activity_comments TO authenticated;

-- Success message
SELECT 'Activity interactions tables (activity_likes, activity_comments) created successfully!' as result;