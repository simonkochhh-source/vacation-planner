-- FIX SCHEMA PERMISSIONS for user_profiles table
-- Execute in: https://supabase.com/dashboard/project/wcsfytpcdfhnvpksgrjv/sql/new

-- STEP 1: Check current schema and permissions
SELECT schemaname, tablename, tableowner FROM pg_tables WHERE tablename = 'user_profiles';

-- STEP 2: Ensure table is in public schema and accessible
ALTER TABLE IF EXISTS user_profiles SET SCHEMA public;

-- STEP 3: Fix permissions for the trigger function
DROP FUNCTION IF EXISTS create_user_profile() CASCADE;

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Use fully qualified table name to avoid schema issues
  INSERT INTO public.user_profiles (id, email, nickname, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Recreate trigger with proper schema reference
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;

CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();

-- STEP 5: Grant proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_profiles TO postgres, authenticated, service_role;
GRANT SELECT ON public.user_profiles TO anon;

-- STEP 6: Ensure RLS is properly configured
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view public profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Recreate policies with explicit schema
CREATE POLICY "Users can view public profiles" ON public.user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (id = auth.uid());

SELECT 'Schema permissions fixed - OAuth should work now!' as result;