-- ========================================
-- STORAGE BUCKET POLICIES
-- ========================================
-- Execute AFTER creating buckets in Supabase Dashboard
-- Dashboard: https://supabase.com/dashboard/project/wcsfytpcdfhnvpksgrjv/storage/buckets
-- ========================================

-- ========================================
-- AVATARS BUCKET POLICIES
-- ========================================
-- Bucket name: avatars (public)

-- Users can view all public avatar files
CREATE POLICY "Public Avatar Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar  
CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========================================
-- TRIP-PHOTOS BUCKET POLICIES  
-- ========================================
-- Bucket name: trip-photos (public)

-- Public photos are viewable by everyone
CREATE POLICY "Public Trip Photos Access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-photos'
    AND (
      -- Public trips photos are accessible
      (storage.foldername(name))[1] IN (
        SELECT id::text FROM trips WHERE privacy = 'public'
      )
      OR
      -- User can see their own photos
      (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Users can upload photos to their trips
CREATE POLICY "Users can upload trip photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'trip-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM trips 
      WHERE owner_id = auth.uid() OR user_id = auth.uid()
    )
  );

-- Users can update their own trip photos
CREATE POLICY "Users can update own trip photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'trip-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own trip photos
CREATE POLICY "Users can delete own trip photos" ON storage.objects  
  FOR DELETE USING (
    bucket_id = 'trip-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ========================================
-- DESTINATION-IMAGES BUCKET POLICIES
-- ========================================
-- Bucket name: destination-images (public)

-- Public destination images viewable by everyone  
CREATE POLICY "Public Destination Images Access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'destination-images'
    AND (
      -- Images from public trips
      (storage.foldername(name))[1] IN (
        SELECT t.id::text FROM trips t
        JOIN destinations d ON d.trip_id = t.id
        WHERE t.privacy = 'public'
      )
      OR
      -- User can see their own destination images
      (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Users can upload destination images  
CREATE POLICY "Users can upload destination images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'destination-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[1] IN (
      SELECT d.id::text FROM destinations d
      JOIN trips t ON t.id = d.trip_id
      WHERE t.owner_id = auth.uid() OR t.user_id = auth.uid()
    )
  );

-- Users can update their own destination images
CREATE POLICY "Users can update own destination images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'destination-images'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Users can delete their own destination images
CREATE POLICY "Users can delete own destination images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'destination-images'  
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ========================================
-- DOCUMENTS BUCKET POLICIES
-- ========================================
-- Bucket name: documents (private)

-- Users can only access their own documents
CREATE POLICY "Users can access own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can upload their own documents
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own documents  
CREATE POLICY "Users can update own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT 'Storage policies created successfully!' as result;