-- MINIMAL OAUTH FIX für Dev Database
-- Nur das absolut Notwendige für OAuth

-- 1. USER PROFILES TABELLE (KRITISCH)
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  email TEXT,
  location TEXT,
  website TEXT,
  social_links JSONB DEFAULT '{}',
  is_public_profile BOOLEAN DEFAULT true,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS AKTIVIEREN
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. BASIC RLS POLICY
CREATE POLICY "Users can view public profiles" ON user_profiles
  FOR SELECT USING (is_public_profile = true OR id = auth.uid());

CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- 4. KRITISCHE OAUTH FUNKTION
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nickname, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. KRITISCHER OAUTH TRIGGER
DROP TRIGGER IF EXISTS trigger_create_user_profile ON auth.users;
CREATE TRIGGER trigger_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- 6. PROFILE FÜR EXISTIERENDE USERS
INSERT INTO user_profiles (id, email, nickname, display_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'nickname', SPLIT_PART(email, '@', 1)) as nickname,
  COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name') as display_name
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

SELECT 'OAUTH FIX COMPLETED! Try Google login now.' as result;