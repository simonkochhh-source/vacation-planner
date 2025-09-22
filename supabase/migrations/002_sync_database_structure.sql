-- Sync database structure with User tables and existing Trip structure
-- This migration ensures all tables work together properly

-- First, let's check if the trips table needs to be updated to match our types
-- Add any missing columns to trips table if they don't exist

DO $$ 
BEGIN
    -- Add ownerId column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'owner_id') THEN
        ALTER TABLE public.trips ADD COLUMN owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add taggedUsers column if it doesn't exist (as an array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'tagged_users') THEN
        ALTER TABLE public.trips ADD COLUMN tagged_users UUID[] DEFAULT ARRAY[]::UUID[];
    END IF;
    
    -- Add privacy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'privacy') THEN
        ALTER TABLE public.trips ADD COLUMN privacy TEXT DEFAULT 'private' 
        CHECK (privacy IN ('private', 'public'));
    END IF;
END $$;

-- Create indexes for better performance on trips table
CREATE INDEX IF NOT EXISTS idx_trips_owner_id ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_tagged_users ON public.trips USING GIN(tagged_users);
CREATE INDEX IF NOT EXISTS idx_trips_privacy ON public.trips(privacy);

-- Create function to check if user has access to a trip
CREATE OR REPLACE FUNCTION public.user_has_trip_access(trip_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.trips 
        WHERE id = trip_id 
        AND (
            owner_id = user_id 
            OR user_id = ANY(tagged_users)
            OR privacy = 'public'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's accessible trips
CREATE OR REPLACE FUNCTION public.get_user_trips(user_id UUID)
RETURNS SETOF public.trips AS $$
BEGIN
    RETURN QUERY
    SELECT t.* FROM public.trips t
    WHERE t.owner_id = user_id 
       OR user_id = ANY(t.tagged_users)
       OR t.privacy = 'public'
    ORDER BY t.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search public trips by user nickname or trip name
CREATE OR REPLACE FUNCTION public.search_public_trips(
    search_term TEXT, 
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    trip_id UUID,
    trip_name TEXT,
    description TEXT,
    owner_nickname TEXT,
    owner_display_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id as trip_id,
        t.name as trip_name,
        t.description,
        u.nickname as owner_nickname,
        u.display_name as owner_display_name,
        t.created_at,
        t.updated_at
    FROM public.trips t
    JOIN public.users u ON t.owner_id = u.id
    WHERE 
        t.privacy = 'public'
        AND u.is_active = true
        AND (
            t.name ILIKE '%' || search_term || '%'
            OR t.description ILIKE '%' || search_term || '%'
            OR u.nickname ILIKE '%' || search_term || '%'
            OR u.display_name ILIKE '%' || search_term || '%'
        )
    ORDER BY 
        -- Exact matches first
        CASE WHEN t.name ILIKE search_term THEN 1 ELSE 2 END,
        -- Recent trips next
        t.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get trip sharing information
CREATE OR REPLACE FUNCTION public.get_trip_sharing_info(trip_id UUID)
RETURNS TABLE (
    owner_info JSON,
    shared_users JSON[]
) AS $$
DECLARE
    owner_data JSON;
    shared_data JSON[];
BEGIN
    -- Get owner information
    SELECT to_json(u.*) INTO owner_data
    FROM public.users u
    JOIN public.trips t ON u.id = t.owner_id
    WHERE t.id = trip_id;
    
    -- Get shared users information
    SELECT ARRAY(
        SELECT to_json(u.*)
        FROM public.users u
        JOIN public.trips t ON u.id = ANY(t.tagged_users)
        WHERE t.id = trip_id
        AND u.is_active = true
    ) INTO shared_data;
    
    RETURN QUERY SELECT owner_data, shared_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for trips table if they don't exist
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'trips' AND relrowsecurity = true
    ) THEN
        ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view shared trips" ON public.trips;
DROP POLICY IF EXISTS "Users can view public trips" ON public.trips;
DROP POLICY IF EXISTS "Users can modify their own trips" ON public.trips;

-- Policy: Users can view their own trips
CREATE POLICY "Users can view their own trips" ON public.trips
    FOR SELECT USING (auth.uid() = owner_id);

-- Policy: Users can view trips shared with them
CREATE POLICY "Users can view shared trips" ON public.trips
    FOR SELECT USING (auth.uid() = ANY(tagged_users));

-- Policy: Everyone can view public trips
CREATE POLICY "Users can view public trips" ON public.trips
    FOR SELECT USING (privacy = 'public');

-- Policy: Users can modify their own trips
CREATE POLICY "Users can modify their own trips" ON public.trips
    FOR ALL USING (auth.uid() = owner_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_trip_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trips TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_trips TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_trip_sharing_info TO authenticated;

-- Create notification function for trip sharing
CREATE OR REPLACE FUNCTION public.notify_trip_shared(
    trip_id UUID,
    shared_with_user_id UUID,
    shared_by_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    trip_name TEXT;
    shared_by_nickname TEXT;
BEGIN
    -- Get trip name and sharer info
    SELECT t.name, u.nickname 
    INTO trip_name, shared_by_nickname
    FROM public.trips t
    JOIN public.users u ON u.id = shared_by_user_id
    WHERE t.id = trip_id;
    
    -- Here you could implement email notifications, push notifications, etc.
    -- For now, we'll just log it
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        created_at
    ) VALUES (
        shared_with_user_id,
        'trip_shared',
        'Neue geteilte Reise',
        shared_by_nickname || ' hat die Reise "' || trip_name || '" mit Ihnen geteilt.',
        json_build_object(
            'trip_id', trip_id,
            'shared_by_user_id', shared_by_user_id,
            'trip_name', trip_name
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.user_has_trip_access IS 'Check if a user has access to view/edit a specific trip';
COMMENT ON FUNCTION public.get_user_trips IS 'Get all trips accessible to a user (owned, shared, or public)';
COMMENT ON FUNCTION public.search_public_trips IS 'Search public trips by name, description, or owner';
COMMENT ON FUNCTION public.get_trip_sharing_info IS 'Get detailed sharing information for a trip';
COMMENT ON FUNCTION public.notify_trip_shared IS 'Create a notification when a trip is shared with a user';
COMMENT ON TABLE public.notifications IS 'User notifications for trip sharing and other events';