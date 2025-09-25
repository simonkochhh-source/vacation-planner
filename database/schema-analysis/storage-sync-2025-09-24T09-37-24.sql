-- Supabase Storage Configuration Migration
-- Generated: 2025-09-24T09:37:24.967Z
-- Purpose: Sync storage buckets and policies from Production to Dev

-- Enable storage extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "supabase_storage" WITH SCHEMA storage;

-- No storage buckets found in production
-- Common vacation planner storage buckets:

-- Create common vacation planner storage buckets
-- User profile avatars and photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit for avatars
  '["image/jpeg", "image/png", "image/webp"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Private trip and destination photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trip-photos',
  'trip-photos',
  false,
  10485760, -- 10MB limit for trip photos
  '["image/jpeg", "image/png", "image/webp", "image/gif"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- Public destination and location images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'destination-images',
  'destination-images',
  true,
  10485760, -- 10MB limit for destination images
  '["image/jpeg", "image/png", "image/webp"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- User documents and attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit for documents
  '["application/pdf", "image/jpeg", "image/png", "text/plain"]'::jsonb
) ON CONFLICT (name) DO NOTHING;

-- No existing storage policies found
-- Create basic RLS policies for storage buckets:

-- Avatar upload policy (authenticated users can upload their own avatar)
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Avatar view policy (everyone can view avatars)
CREATE POLICY "Avatars are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Trip photo upload policy (users can upload to their own trips)
CREATE POLICY "Users can upload trip photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'trip-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Trip photo view policy (users can view their own trip photos)
CREATE POLICY "Users can view their trip photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'trip-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Public destination images (everyone can view)
CREATE POLICY "Destination images are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'destination-images');

-- Destination image upload (authenticated users only)
CREATE POLICY "Authenticated users can upload destination images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'destination-images' AND
  auth.role() = 'authenticated'
);
