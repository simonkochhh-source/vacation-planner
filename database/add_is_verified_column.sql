-- Add missing is_verified column to user_profiles table

-- Add the is_verified column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Update existing users: Mark all existing users as verified for now
-- This is a simple approach - in production you might want more granular control
UPDATE user_profiles 
SET is_verified = true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_verified ON user_profiles(is_verified);

-- Success message
SELECT 'is_verified column added successfully!' AS result;