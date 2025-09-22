-- Migration to handle existing OAuth users and ensure proper nickname generation
-- This migration updates any existing users who might not have proper nicknames

-- First, let's create a function to update existing OAuth users
CREATE OR REPLACE FUNCTION public.migrate_existing_oauth_users()
RETURNS INTEGER AS $$
DECLARE
    user_record RECORD;
    updated_count INTEGER := 0;
    new_nickname TEXT;
    nickname_counter INTEGER;
BEGIN
    -- Loop through all auth users who don't have a corresponding users record
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_app_meta_data, au.raw_user_meta_data, au.email_confirmed_at
        FROM auth.users au
        LEFT JOIN public.users u ON au.id = u.id
        WHERE u.id IS NULL
    LOOP
        -- Generate appropriate nickname
        IF user_record.raw_app_meta_data->>'provider' IS NOT NULL 
           AND user_record.raw_app_meta_data->>'provider' != 'email' THEN
            -- OAuth user - generate thematic nickname
            new_nickname := public.generate_thematic_nickname();
            nickname_counter := 0;
            
            -- Ensure uniqueness
            WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = new_nickname) LOOP
                new_nickname := public.generate_thematic_nickname();
                nickname_counter := nickname_counter + 1;
                -- Prevent infinite loop
                IF nickname_counter > 10 THEN
                    new_nickname := new_nickname || ((RANDOM() * 9999)::INTEGER + 1)::TEXT;
                    EXIT;
                END IF;
            END LOOP;
        ELSE
            -- Email user - use email-based generation
            new_nickname := LOWER(SPLIT_PART(user_record.email, '@', 1));
            new_nickname := REGEXP_REPLACE(new_nickname, '[^a-z0-9]', '', 'g');
            
            IF LENGTH(new_nickname) < 3 THEN
                new_nickname := public.generate_thematic_nickname();
            ELSE
                new_nickname := new_nickname || 'journey';
            END IF;
            
            nickname_counter := 0;
            WHILE EXISTS (SELECT 1 FROM public.users WHERE nickname = new_nickname) LOOP
                nickname_counter := nickname_counter + 1;
                new_nickname := REGEXP_REPLACE(LOWER(SPLIT_PART(user_record.email, '@', 1)), '[^a-z0-9]', '', 'g') || nickname_counter::TEXT;
            END LOOP;
        END IF;
        
        -- Insert the user record
        INSERT INTO public.users (
            id,
            email,
            nickname,
            display_name,
            avatar_url,
            is_verified,
            language,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            user_record.email,
            new_nickname,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'name'
            ),
            user_record.raw_user_meta_data->>'avatar_url',
            CASE 
                WHEN user_record.raw_app_meta_data->>'provider' IS NOT NULL 
                     AND user_record.raw_app_meta_data->>'provider' != 'email' 
                THEN true  -- OAuth users are automatically verified
                ELSE user_record.email_confirmed_at IS NOT NULL
            END,
            COALESCE(user_record.raw_user_meta_data->>'locale', 'de'),
            NOW(),
            NOW()
        );
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the migration for existing users
SELECT public.migrate_existing_oauth_users() as migrated_users_count;

-- Update any users with missing nicknames or problematic nicknames
UPDATE public.users 
SET nickname = public.generate_thematic_nickname(),
    updated_at = NOW()
WHERE nickname IS NULL 
   OR nickname = '' 
   OR LENGTH(nickname) < 3;

-- Update verification status for OAuth users who might not be marked as verified
UPDATE public.users u
SET is_verified = true,
    updated_at = NOW()
FROM auth.users au
WHERE u.id = au.id
  AND u.is_verified = false
  AND au.raw_app_meta_data->>'provider' IS NOT NULL
  AND au.raw_app_meta_data->>'provider' != 'email';

-- Create a view for easier OAuth user identification
CREATE OR REPLACE VIEW public.oauth_users AS
SELECT 
    u.*,
    au.raw_app_meta_data->>'provider' as oauth_provider
FROM public.users u
JOIN auth.users au ON u.id = au.id
WHERE au.raw_app_meta_data->>'provider' IS NOT NULL
  AND au.raw_app_meta_data->>'provider' != 'email';

-- Grant access to the view
GRANT SELECT ON public.oauth_users TO authenticated;

-- Create function to check if a user is OAuth
CREATE OR REPLACE FUNCTION public.is_oauth_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM auth.users au 
        WHERE au.id = user_id 
          AND au.raw_app_meta_data->>'provider' IS NOT NULL 
          AND au.raw_app_meta_data->>'provider' != 'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get OAuth provider for a user
CREATE OR REPLACE FUNCTION public.get_user_oauth_provider(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    provider TEXT;
BEGIN
    SELECT au.raw_app_meta_data->>'provider' 
    INTO provider
    FROM auth.users au 
    WHERE au.id = user_id;
    
    IF provider = 'email' OR provider IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN provider;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.is_oauth_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_oauth_provider TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_existing_oauth_users TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.migrate_existing_oauth_users IS 'Migrate existing OAuth users who do not have user records';
COMMENT ON FUNCTION public.is_oauth_user IS 'Check if a user authenticated via OAuth (Google, Apple, etc.)';
COMMENT ON FUNCTION public.get_user_oauth_provider IS 'Get the OAuth provider for a user (google, apple, etc.)';
COMMENT ON VIEW public.oauth_users IS 'View of all OAuth-authenticated users with their provider information';

-- Create an index for better performance on OAuth provider queries
CREATE INDEX IF NOT EXISTS idx_auth_users_provider 
ON auth.users USING GIN((raw_app_meta_data->>'provider'));

-- Log completion
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT public.migrate_existing_oauth_users() INTO migrated_count;
    RAISE NOTICE 'OAuth user migration completed. Migrated % users.', migrated_count;
END $$;