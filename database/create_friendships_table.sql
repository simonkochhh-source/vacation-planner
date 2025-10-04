-- Create Friendships Table
-- This creates a dedicated table for established friendships, separate from follow requests

-- 1. Drop existing friendships view if it exists
DROP VIEW IF EXISTS friendships;

-- 2. Create the friendships table for established friendships
CREATE TABLE IF NOT EXISTS friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure user1_id is always the smaller UUID (for consistency)
    CONSTRAINT friendships_user_order CHECK (user1_id < user2_id),
    
    -- Ensure no duplicate friendships
    CONSTRAINT friendships_unique UNIQUE (user1_id, user2_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(user1_id, user2_id);

-- 4. Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Users can view their own friendships" ON friendships
    FOR SELECT USING (
        auth.uid() = user1_id OR auth.uid() = user2_id
    );

CREATE POLICY "Service can manage friendships" ON friendships
    FOR ALL USING (true);

-- 6. Drop existing functions if they exist
DROP FUNCTION IF EXISTS are_users_friends(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_friends(UUID);
DROP FUNCTION IF EXISTS add_friendship(UUID, UUID);
DROP FUNCTION IF EXISTS remove_friendship(UUID, UUID);

-- 7. Create helper functions

-- Function to add a friendship
CREATE OR REPLACE FUNCTION add_friendship(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friendship_id UUID;
    min_user_id UUID;
    max_user_id UUID;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF user_a < user_b THEN
        min_user_id := user_a;
        max_user_id := user_b;
    ELSE
        min_user_id := user_b;
        max_user_id := user_a;
    END IF;
    
    -- Insert friendship
    INSERT INTO friendships (user1_id, user2_id)
    VALUES (min_user_id, max_user_id)
    ON CONFLICT (user1_id, user2_id) DO UPDATE SET
        updated_at = NOW()
    RETURNING id INTO friendship_id;
    
    RETURN friendship_id;
END;
$$;

-- Function to remove a friendship
CREATE OR REPLACE FUNCTION remove_friendship(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    min_user_id UUID;
    max_user_id UUID;
    deleted_count INTEGER;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF user_a < user_b THEN
        min_user_id := user_a;
        max_user_id := user_b;
    ELSE
        min_user_id := user_b;
        max_user_id := user_a;
    END IF;
    
    -- Remove friendship
    DELETE FROM friendships 
    WHERE user1_id = min_user_id AND user2_id = max_user_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    min_user_id UUID;
    max_user_id UUID;
BEGIN
    -- Ensure consistent ordering (smaller UUID first)
    IF user_a < user_b THEN
        min_user_id := user_a;
        max_user_id := user_b;
    ELSE
        min_user_id := user_b;
        max_user_id := user_a;
    END IF;
    
    -- Check if friendship exists
    RETURN EXISTS (
        SELECT 1 FROM friendships 
        WHERE user1_id = min_user_id AND user2_id = max_user_id
    );
END;
$$;

-- Function to get friends for a user
CREATE OR REPLACE FUNCTION get_user_friends(target_user_id UUID)
RETURNS TABLE (
    friend_id UUID,
    friendship_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f.user1_id = target_user_id THEN f.user2_id 
            ELSE f.user1_id 
        END as friend_id,
        f.created_at as friendship_created_at
    FROM friendships f
    WHERE f.user1_id = target_user_id OR f.user2_id = target_user_id;
END;
$$;

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON friendships TO authenticated;
GRANT EXECUTE ON FUNCTION add_friendship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friendship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION are_users_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO authenticated;

-- Success message
SELECT 'Friendships table and functions created successfully!' as result;