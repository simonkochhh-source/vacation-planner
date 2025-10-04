-- Enhance Friendships Table with Status and Request Management
-- This adds status tracking for friendship requests with bilateral approval

-- 1. Add status and request tracking columns
ALTER TABLE friendships 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create index for status queries
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_requested_by ON friendships(requested_by);

-- 3. Update constraints to allow pending friendships
-- Drop the old ordering constraint temporarily
ALTER TABLE friendships DROP CONSTRAINT IF EXISTS friendships_user_order;

-- Add new constraint that works with request direction
ALTER TABLE friendships ADD CONSTRAINT friendships_valid_users 
CHECK (user1_id != user2_id);

-- 4. Drop and recreate helper functions with status support

DROP FUNCTION IF EXISTS add_friendship(UUID, UUID);
DROP FUNCTION IF EXISTS remove_friendship(UUID, UUID);
DROP FUNCTION IF EXISTS are_users_friends(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_friends(UUID);

-- Function to send a friendship request
CREATE OR REPLACE FUNCTION send_friendship_request(requester_id UUID, target_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friendship_id UUID;
    existing_friendship_id UUID;
BEGIN
    -- Check if any relationship already exists (in either direction)
    SELECT id INTO existing_friendship_id
    FROM friendships 
    WHERE (user1_id = requester_id AND user2_id = target_id)
       OR (user1_id = target_id AND user2_id = requester_id)
    LIMIT 1;
    
    IF existing_friendship_id IS NOT NULL THEN
        RAISE EXCEPTION 'Friendship request already exists between these users';
    END IF;
    
    -- Create new friendship request (requester first)
    INSERT INTO friendships (user1_id, user2_id, status, requested_by, requested_at)
    VALUES (requester_id, target_id, 'PENDING', requester_id, NOW())
    RETURNING id INTO friendship_id;
    
    RETURN friendship_id;
END;
$$;

-- Function to accept a friendship request
CREATE OR REPLACE FUNCTION accept_friendship_request(target_id UUID, requester_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friendship_id UUID;
BEGIN
    -- Find the pending friendship request
    SELECT id INTO friendship_id
    FROM friendships 
    WHERE ((user1_id = requester_id AND user2_id = target_id)
       OR (user1_id = target_id AND user2_id = requester_id))
      AND status = 'PENDING'
      AND requested_by = requester_id
    LIMIT 1;
    
    IF friendship_id IS NULL THEN
        RAISE EXCEPTION 'No pending friendship request found';
    END IF;
    
    -- Accept the friendship
    UPDATE friendships 
    SET status = 'ACCEPTED', updated_at = NOW()
    WHERE id = friendship_id;
    
    RETURN TRUE;
END;
$$;

-- Function to decline a friendship request
CREATE OR REPLACE FUNCTION decline_friendship_request(target_id UUID, requester_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friendship_id UUID;
BEGIN
    -- Find the pending friendship request
    SELECT id INTO friendship_id
    FROM friendships 
    WHERE ((user1_id = requester_id AND user2_id = target_id)
       OR (user1_id = target_id AND user2_id = requester_id))
      AND status = 'PENDING'
      AND requested_by = requester_id
    LIMIT 1;
    
    IF friendship_id IS NULL THEN
        RAISE EXCEPTION 'No pending friendship request found';
    END IF;
    
    -- Update status to declined
    UPDATE friendships 
    SET status = 'DECLINED', updated_at = NOW()
    WHERE id = friendship_id;
    
    RETURN TRUE;
END;
$$;

-- Function to remove a friendship
CREATE OR REPLACE FUNCTION remove_friendship(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove friendship in either direction
    DELETE FROM friendships 
    WHERE (user1_id = user_a AND user2_id = user_b)
       OR (user1_id = user_b AND user2_id = user_a);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$;

-- Function to check if users are friends (accepted status)
CREATE OR REPLACE FUNCTION are_users_friends(user_a UUID, user_b UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM friendships 
        WHERE ((user1_id = user_a AND user2_id = user_b)
           OR (user1_id = user_b AND user2_id = user_a))
          AND status = 'ACCEPTED'
    );
END;
$$;

-- Function to get friendship status between two users
CREATE OR REPLACE FUNCTION get_friendship_status(user_a UUID, user_b UUID)
RETURNS TABLE (
    status VARCHAR(20),
    requested_by UUID,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT f.status, f.requested_by, f.created_at
    FROM friendships f
    WHERE ((f.user1_id = user_a AND f.user2_id = user_b)
       OR (f.user1_id = user_b AND f.user2_id = user_a))
      AND f.status IN ('PENDING', 'ACCEPTED')
    LIMIT 1;
END;
$$;

-- Function to get accepted friends for a user
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
    WHERE (f.user1_id = target_user_id OR f.user2_id = target_user_id)
      AND f.status = 'ACCEPTED';
END;
$$;

-- Function to get pending friendship requests for a user
CREATE OR REPLACE FUNCTION get_pending_friendship_requests(target_user_id UUID)
RETURNS TABLE (
    requester_id UUID,
    friendship_id UUID,
    requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.requested_by as requester_id,
        f.id as friendship_id,
        f.requested_at
    FROM friendships f
    WHERE (f.user1_id = target_user_id OR f.user2_id = target_user_id)
      AND f.status = 'PENDING'
      AND f.requested_by != target_user_id  -- Only requests TO this user
    ORDER BY f.requested_at DESC;
END;
$$;

-- Function to get sent friendship requests by a user
CREATE OR REPLACE FUNCTION get_sent_friendship_requests(requester_id UUID)
RETURNS TABLE (
    target_id UUID,
    friendship_id UUID,
    requested_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f.user1_id = requester_id THEN f.user2_id 
            ELSE f.user1_id 
        END as target_id,
        f.id as friendship_id,
        f.requested_at
    FROM friendships f
    WHERE (f.user1_id = requester_id OR f.user2_id = requester_id)
      AND f.status = 'PENDING'
      AND f.requested_by = requester_id;  -- Only requests FROM this user
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION send_friendship_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friendship_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_friendship_request(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friendship(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION are_users_friends(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friendship_status(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friendship_requests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sent_friendship_requests(UUID) TO authenticated;

-- Success message
SELECT 'Enhanced friendships table with status management created successfully!' as result;