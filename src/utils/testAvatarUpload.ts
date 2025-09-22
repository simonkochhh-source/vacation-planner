import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';

/**
 * Test Avatar Upload Connection to Supabase
 * This utility tests the complete avatar upload flow
 */
export async function testAvatarUploadConnection() {
  console.log('🧪 Testing Avatar Upload Connection to Supabase...');
  console.log('====================================================');

  const results = {
    authCheck: false,
    bucketExists: false,
    bucketPublic: false,
    policiesExist: false,
    uploadPermission: false,
    errorDetails: [] as string[]
  };

  try {
    // 1. Check Authentication
    console.log('1️⃣ Checking Authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth: User not authenticated');
      results.errorDetails.push('User not authenticated');
      return results;
    }
    
    console.log('✅ Auth: User authenticated:', user.email);
    results.authCheck = true;

    // 2. Check if avatars bucket exists
    console.log('2️⃣ Checking Storage Bucket...');
    const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
    
    if (bucketListError) {
      console.error('❌ Storage: Cannot list buckets:', bucketListError.message);
      results.errorDetails.push(`Bucket list error: ${bucketListError.message}`);
      return results;
    }

    const avatarBucket = buckets?.find(bucket => bucket.id === 'avatars');
    if (!avatarBucket) {
      console.error('❌ Storage: Avatars bucket does not exist');
      results.errorDetails.push('Avatars bucket does not exist - run migration 004');
      return results;
    }

    console.log('✅ Storage: Avatars bucket exists');
    results.bucketExists = true;

    // Check if bucket is public
    if (avatarBucket.public) {
      console.log('✅ Storage: Bucket is public');
      results.bucketPublic = true;
    } else {
      console.log('⚠️ Storage: Bucket is private - avatars may not display publicly');
      results.errorDetails.push('Bucket should be public for avatar display');
    }

    // 3. Test bucket access (list files)
    console.log('3️⃣ Testing Bucket Access...');
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });

    if (listError) {
      console.error('❌ Storage: Cannot access bucket:', listError.message);
      results.errorDetails.push(`Bucket access error: ${listError.message}`);
    } else {
      console.log('✅ Storage: Can access bucket');
    }

    // 4. Test upload permission with dummy file
    console.log('4️⃣ Testing Upload Permission...');
    
    // Create a tiny test file (1x1 pixel PNG)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testFile = dataURLtoFile(testImageData, 'test-avatar.png');
    
    try {
      const testFileName = `${user.id}-test-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(testFileName, testFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload: Permission denied or other error:', uploadError.message);
        results.errorDetails.push(`Upload error: ${uploadError.message}`);
        
        // Provide specific guidance based on error
        if (uploadError.message.includes('new row violates row-level security')) {
          results.errorDetails.push('RLS policies missing - create storage policies in Supabase dashboard');
        }
      } else {
        console.log('✅ Upload: Test file uploaded successfully');
        results.uploadPermission = true;

        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([testFileName]);
        
        if (deleteError) {
          console.warn('⚠️ Cleanup: Could not delete test file:', deleteError.message);
        } else {
          console.log('✅ Cleanup: Test file deleted');
        }
      }
    } catch (error: any) {
      console.error('❌ Upload: Unexpected error:', error.message);
      results.errorDetails.push(`Unexpected upload error: ${error.message}`);
    }

    // 5. Test public URL generation
    console.log('5️⃣ Testing Public URL Generation...');
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl('test-file.png');

    if (urlData?.publicUrl) {
      console.log('✅ URLs: Public URL generation works:', urlData.publicUrl);
    } else {
      console.error('❌ URLs: Cannot generate public URLs');
      results.errorDetails.push('Cannot generate public URLs');
    }

  } catch (error: any) {
    console.error('💥 Test: Unexpected error during testing:', error.message);
    results.errorDetails.push(`Test error: ${error.message}`);
  }

  // Summary
  console.log('');
  console.log('📊 Test Results Summary:');
  console.log('========================');
  console.log(`✅ Auth Check: ${results.authCheck ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Bucket Exists: ${results.bucketExists ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Bucket Public: ${results.bucketPublic ? 'PASS' : 'WARN'}`);
  console.log(`✅ Upload Permission: ${results.uploadPermission ? 'PASS' : 'FAIL'}`);

  if (results.errorDetails.length > 0) {
    console.log('');
    console.log('🚨 Issues Found:');
    results.errorDetails.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  if (results.authCheck && results.bucketExists && results.uploadPermission) {
    console.log('');
    console.log('🎉 Avatar upload is fully configured and ready to use!');
  } else {
    console.log('');
    console.log('⚠️ Avatar upload needs configuration. See AVATAR_SETUP.md for details.');
  }

  return results;
}

/**
 * Convert data URL to File object for testing
 */
function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Test the complete UserService avatar upload flow
 */
export async function testUserServiceAvatarUpload() {
  console.log('🧪 Testing UserService Avatar Upload...');
  console.log('=====================================');

  try {
    // Create test file
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testFile = dataURLtoFile(testImageData, 'test-avatar.png');

    // Test upload
    console.log('📤 Testing userService.uploadAvatar()...');
    const avatarUrl = await userService.uploadAvatar(testFile);
    
    if (avatarUrl) {
      console.log('✅ Upload successful! Avatar URL:', avatarUrl);
      
      // Test update profile with new avatar
      console.log('📝 Testing profile update with avatar...');
      const updatedProfile = await userService.updateUserProfile({
        avatar_url: avatarUrl
      });
      
      if (updatedProfile) {
        console.log('✅ Profile updated with avatar URL');
        
        // Clean up - remove avatar
        console.log('🧹 Cleaning up test avatar...');
        await userService.updateUserProfile({
          avatar_url: null
        });
        console.log('✅ Test avatar cleaned up');
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ UserService test failed:', error.message);
    return false;
  }
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testAvatarUpload = testAvatarUploadConnection;
  (window as any).testUserServiceAvatar = testUserServiceAvatarUpload;
}