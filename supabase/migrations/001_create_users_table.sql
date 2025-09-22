-- Create Users Table for Trailkeeper
-- This table extends Supabase Auth with custom user profile data

-- Create users table
CREATE TABLE public.users (
    -- Primary key that references Supabase auth.users
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- User profile information
    email TEXT NOT NULL UNIQUE,
    nickname TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    
    -- User preferences
    language TEXT DEFAULT 'de' CHECK (language IN ('de', 'en')),
    timezone TEXT DEFAULT 'Europe/Berlin',
    
    -- Privacy settings
    is_profile_public BOOLEAN DEFAULT false,
    allow_friend_requests BOOLEAN DEFAULT true,
    allow_trip_invitations BOOLEAN DEFAULT true,
    
    -- User status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_nickname ON public.users(nickname);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_is_active ON public.users(is_active);
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate thematic nicknames for Trailkeeper
CREATE OR REPLACE FUNCTION public.generate_thematic_nickname()
RETURNS TEXT AS $$
DECLARE
    travel_themes TEXT[] := ARRAY[
        'adventurer', 'explorer', 'wanderer', 'nomad', 'traveler', 'hiker', 'camper',
        'roadtripper', 'backpacker', 'globetrotter', 'mountaineer', 'trailblazer'
    ];
    nature_words TEXT[] := ARRAY[
        'alpine', 'forest', 'canyon', 'summit', 'valley', 'ocean', 'river',
        'peak', 'trail', 'wild', 'scenic', 'coastal', 'desert', 'prairie'
    ];
    adjectives TEXT[] := ARRAY[
        'epic', 'brave', 'free', 'bold', 'wild', 'swift', 'keen', 'calm',
        'bright', 'clever', 'steady', 'noble', 'wise', 'agile', 'fierce'
    ];
    pattern_choice INTEGER;
    result_nickname TEXT;
BEGIN
    -- Choose random pattern (1-4)
    pattern_choice := (RANDOM() * 4)::INTEGER + 1;
    
    CASE pattern_choice
        WHEN 1 THEN
            -- Pattern: theme + number
            result_nickname := travel_themes[(RANDOM() * array_length(travel_themes, 1))::INTEGER + 1] ||
                             ((RANDOM() * 999)::INTEGER + 1)::TEXT;
        WHEN 2 THEN
            -- Pattern: adjective + nature
            result_nickname := adjectives[(RANDOM() * array_length(adjectives, 1))::INTEGER + 1] ||
                             nature_words[(RANDOM() * array_length(nature_words, 1))::INTEGER + 1];
        WHEN 3 THEN
            -- Pattern: nature + theme
            result_nickname := nature_words[(RANDOM() * array_length(nature_words, 1))::INTEGER + 1] ||
                             travel_themes[(RANDOM() * array_length(travel_themes, 1))::INTEGER + 1];
        ELSE
            -- Pattern: theme + adjective + number
            result_nickname := travel_themes[(RANDOM() * array_length(travel_themes, 1))::INTEGER + 1] ||
                             adjectives[(RANDOM() * array_length(adjectives, 1))::INTEGER + 1] ||
                             ((RANDOM() * 99)::INTEGER + 1)::TEXT;
    END CASE;
    
    RETURN result_nickname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    nickname_base TEXT;
    nickname_counter INTEGER := 0;
    final_nickname TEXT;
    is_oauth_user BOOLEAN;
    provider TEXT;
BEGIN
    -- Check if this is an OAuth user
    provider := NEW.raw_app_meta_data->>'provider';
    is_oauth_user := provider IS NOT NULL AND provider != 'email';
    
    -- Log user creation for debugging
    RAISE NOTICE 'Creating user: email=%, provider=%, is_oauth=%', NEW.email, provider, is_oauth_user;
    
    IF is_oauth_user THEN
        -- For OAuth users (Google, Apple, etc.), generate thematic nickname
        final_nickname := public.generate_thematic_nickname();
        
        -- Ensure uniqueness for thematic nicknames
        WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = final_nickname) LOOP
            final_nickname := public.generate_thematic_nickname();
            nickname_counter := nickname_counter + 1;
            -- Prevent infinite loop
            IF nickname_counter > 10 THEN
                final_nickname := final_nickname || ((RANDOM() * 9999)::INTEGER + 1)::TEXT;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        -- For email users, use email-based generation
        nickname_base := LOWER(SPLIT_PART(NEW.email, '@', 1));
        
        -- Remove special characters and keep only alphanumeric
        nickname_base := REGEXP_REPLACE(nickname_base, '[^a-z0-9]', '', 'g');
        
        -- Ensure minimum length or use thematic generation
        IF LENGTH(nickname_base) < 3 THEN
            final_nickname := public.generate_thematic_nickname();
        ELSE
            -- Add travel-themed suffix to email-based nickname
            final_nickname := nickname_base || 
                CASE (RANDOM() * 6)::INTEGER
                    WHEN 0 THEN 'trek'
                    WHEN 1 THEN 'trail'
                    WHEN 2 THEN 'camp'
                    WHEN 3 THEN 'roam'
                    WHEN 4 THEN 'quest'
                    ELSE 'journey'
                END;
        END IF;
        
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = final_nickname) LOOP
            nickname_counter := nickname_counter + 1;
            IF LENGTH(nickname_base) < 3 THEN
                final_nickname := public.generate_thematic_nickname();
            ELSE
                final_nickname := nickname_base || nickname_counter::TEXT;
            END IF;
        END LOOP;
    END IF;
    
    -- Insert new user record with error handling
    BEGIN
        INSERT INTO public.users (
            id, 
            email, 
            nickname, 
            display_name,
            avatar_url,
            is_verified,
            language
        ) VALUES (
            NEW.id,
            NEW.email,
            final_nickname,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
            NEW.raw_user_meta_data->>'avatar_url',
            CASE 
                WHEN is_oauth_user THEN true  -- OAuth users are automatically verified
                ELSE NEW.email_confirmed_at IS NOT NULL
            END,
            COALESCE(NEW.raw_user_meta_data->>'locale', 'de')  -- Default to German
        );
        
        RAISE NOTICE 'User created successfully: nickname=%', final_nickname;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Handle nickname conflicts by adding random suffix
            final_nickname := final_nickname || '_' || ((RANDOM() * 1000)::INTEGER)::TEXT;
            INSERT INTO public.users (
                id, email, nickname, display_name, avatar_url, is_verified, language
            ) VALUES (
                NEW.id, NEW.email, final_nickname,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
                NEW.raw_user_meta_data->>'avatar_url',
                CASE WHEN is_oauth_user THEN true ELSE NEW.email_confirmed_at IS NOT NULL END,
                COALESCE(NEW.raw_user_meta_data->>'locale', 'de')
            );
            RAISE NOTICE 'User created with conflict resolution: nickname=%', final_nickname;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create user search function
CREATE OR REPLACE FUNCTION public.search_users(search_term TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    nickname TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.nickname,
        u.display_name,
        u.avatar_url,
        u.is_verified
    FROM public.users u
    WHERE 
        u.is_active = true 
        AND u.is_profile_public = true
        AND (
            u.nickname ILIKE '%' || search_term || '%' 
            OR u.display_name ILIKE '%' || search_term || '%'
        )
    ORDER BY 
        -- Exact matches first
        CASE WHEN u.nickname = search_term THEN 1 ELSE 2 END,
        -- Then by verification status
        CASE WHEN u.is_verified THEN 1 ELSE 2 END,
        -- Then alphabetically
        u.nickname
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can view public profiles
CREATE POLICY "Users can view public profiles" ON public.users
    FOR SELECT USING (is_profile_public = true AND is_active = true);

-- Policy: Service role can manage all users (for admin functions)
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO authenticated;

-- Create helper view for public user information
CREATE VIEW public.public_users AS
SELECT 
    id,
    nickname,
    display_name,
    avatar_url,
    is_verified,
    created_at
FROM public.users 
WHERE is_profile_public = true AND is_active = true;

GRANT SELECT ON public.public_users TO authenticated;

-- Insert comment for documentation
COMMENT ON TABLE public.users IS 'Extended user profiles for Trailkeeper application';
COMMENT ON COLUMN public.users.nickname IS 'Unique, searchable username for user identification';
COMMENT ON COLUMN public.users.is_profile_public IS 'Whether user profile is visible to other users';
COMMENT ON FUNCTION public.search_users IS 'Search for users by nickname or display name';