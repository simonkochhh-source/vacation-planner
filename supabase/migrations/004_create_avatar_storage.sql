-- Create Avatar Storage Bucket
-- This sets up secure avatar image storage for user profiles

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be created manually in the Supabase Dashboard
-- Go to Storage → Settings → Policies and create these policies:

-- 1. "Users can upload own avatars" (INSERT)
--    USING: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- 2. "Users can update own avatars" (UPDATE) 
--    USING: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- 3. "Users can delete own avatars" (DELETE)
--    USING: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- 4. "Anyone can view avatars" (SELECT)
--    USING: bucket_id = 'avatars'

-- Alternative: Enable RLS and create policies via dashboard
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;