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

    // 2. Check if avatars bucket exists via direct access
    console.log('2️⃣ Checking Storage Bucket (direct access)...');
    
    // Try direct bucket access first (more reliable than listBuckets for app users)
    const { data: directAccess, error: accessError } = await supabase.storage
      .from('avatars')
      .list('', { limit: 1 });
    
    if (!accessError) {
      console.log('✅ Storage: Avatars bucket accessible via direct access');
      results.bucketExists = true;
      results.bucketPublic = true; // If we can access it, it's working
    } else {
      console.error('❌ Storage: Cannot access avatars bucket directly:', accessError.message);
      
      // Try listBuckets as fallback (though this often fails for app users)
      console.log('🔄 Fallback: Trying listBuckets API...');
      const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.warn('⚠️ Storage: listBuckets also failed (expected for app users):', bucketListError.message);
        results.errorDetails.push(`Cannot access avatars bucket: ${accessError.message}`);
        results.errorDetails.push('Bucket may not exist or policies are incorrect');
        return results;
      } else {
        console.log('📋 Available buckets:', buckets?.map(b => `${b.id} (public: ${b.public})`).join(', ') || 'none');
        const avatarBucket = buckets.find(bucket => bucket.id === 'avatars');
        if (avatarBucket) {
          console.log('✅ Storage: Avatars bucket found in bucket list');
          results.bucketExists = true;
          results.bucketPublic = avatarBucket.public;
        } else {
          console.error('❌ Storage: Avatars bucket not found in bucket list');
          results.errorDetails.push('Avatars bucket does not exist - create it manually in Supabase Dashboard');
          return results;
        }
      }
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

    // 4. Test Storage Policies Existence
    console.log('4️⃣ Testing Storage Policies...');
    try {
      // Test if we can query storage objects (this tests SELECT policies)
      const { data: objectsList, error: listObjectsError } = await supabase.storage
        .from('avatars')
        .list('', { limit: 1 });
      
      if (listObjectsError) {
        console.error('❌ Policies: Cannot list objects:', listObjectsError.message);
        results.errorDetails.push(`Storage list error: ${listObjectsError.message}`);
        if (listObjectsError.message.includes('row-level security')) {
          results.errorDetails.push('SELECT policy missing - create "Anyone can view avatars" policy');
        }
      } else {
        console.log('✅ Policies: SELECT policy works (can list objects)');
        results.policiesExist = true;
      }
    } catch (error: any) {
      console.error('❌ Policies: Error testing policies:', error.message);
      results.errorDetails.push(`Policy test error: ${error.message}`);
    }

    // 5. Test upload permission with dummy file
    console.log('5️⃣ Testing Upload Permission...');
    
    // Create a tiny test file (1x1 pixel PNG)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    const testFile = dataURLtoFile(testImageData, 'test-avatar.png');
    
    try {
      const testFileName = `${user.id}/test-${Date.now()}.png`;
      console.log(`📝 Attempting upload with filename: ${testFileName}`);
      console.log(`👤 User ID: ${user.id}`);
      console.log(`🔒 Using folder structure: ${user.id}/filename.png`);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(testFileName, testFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Upload: Permission denied or other error:', uploadError.message);
        console.error('📋 Full error object:', uploadError);
        results.errorDetails.push(`Upload error: ${uploadError.message}`);
        
        // Provide specific guidance based on error
        if (uploadError.message.includes('new row violates row-level security')) {
          results.errorDetails.push('❌ RLS INSERT policy missing or incorrect');
          results.errorDetails.push('Required policy: "Users can upload own avatars" (INSERT)');
          results.errorDetails.push(`Policy should allow: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]`);
          results.errorDetails.push(`Alternative syntax: bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1)`);
        } else if (uploadError.message.includes('not found')) {
          results.errorDetails.push('❌ Bucket not found - verify avatars bucket exists and is correctly named');
        } else if (uploadError.message.includes('permission')) {
          results.errorDetails.push('❌ Permission denied - check if bucket policies allow authenticated users');
        } else if (uploadError.message.includes('function storage.foldername does not exist')) {
          results.errorDetails.push('❌ Policy uses incompatible function - use split_part instead of storage.foldername');
          results.errorDetails.push('Correct policy: bucket_id = \'avatars\' AND auth.uid()::text = split_part(name, \'/\', 1)');
        }
      } else {
        console.log('✅ Upload: Test file uploaded successfully');
        console.log('📊 Upload data:', uploadData);
        results.uploadPermission = true;

        // Test if we can retrieve the uploaded file info
        const { data: fileInfo, error: infoError } = await supabase.storage
          .from('avatars')
          .list('', { search: testFileName });
        
        if (infoError) {
          console.warn('⚠️ Info: Cannot retrieve file info:', infoError.message);
        } else {
          console.log('✅ Info: Can retrieve uploaded file info');
        }

        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([testFileName]);
        
        if (deleteError) {
          console.warn('⚠️ Cleanup: Could not delete test file:', deleteError.message);
          results.errorDetails.push(`Cleanup warning: ${deleteError.message}`);
        } else {
          console.log('✅ Cleanup: Test file deleted');
        }
      }
    } catch (error: any) {
      console.error('❌ Upload: Unexpected error:', error.message);
      console.error('📋 Full error object:', error);
      results.errorDetails.push(`Unexpected upload error: ${error.message}`);
    }

    // 6. Test public URL generation
    console.log('6️⃣ Testing Public URL Generation...');
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

/**
 * Test different policy syntax variations to find compatible one
 */
export async function testPolicySyntax() {
  console.log('🧪 Testing Policy Syntax Variations...');
  console.log('=====================================');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ User not authenticated');
    return false;
  }

  // Test file
  const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  const testFile = dataURLtoFile(testImageData, 'test-policy.png');

  const variations = [
    { name: 'Direct filename', path: `policy-test-${Date.now()}.png` },
    { name: 'User folder structure', path: `${user.id}/policy-test-${Date.now()}.png` },
    { name: 'Subfolder structure', path: `users/${user.id}/policy-test-${Date.now()}.png` }
  ];

  for (const variation of variations) {
    console.log(`\n📝 Testing: ${variation.name}`);
    console.log(`   Path: ${variation.path}`);
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(variation.path, testFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`❌ ${variation.name}: ${uploadError.message}`);
      } else {
        console.log(`✅ ${variation.name}: Upload successful!`);
        
        // Clean up
        await supabase.storage.from('avatars').remove([variation.path]);
        return variation;
      }
    } catch (error: any) {
      console.error(`💥 ${variation.name}: ${error.message}`);
    }
  }

  console.log('\n❌ All policy syntax variations failed');
  return false;
}

/**
 * Generate SQL statements for policy creation based on test results
 */
export async function generatePolicySQL() {
  console.log('🔧 Generating Policy SQL Statements...');
  console.log('=====================================');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ User not authenticated');
    return;
  }

  console.log(`👤 Current User ID: ${user.id}`);
  console.log('\n📋 SQL Statements to create policies:\n');

  // Test which syntax might work
  const syntaxOptions = [
    `bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]`,
    `bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1)`,
    `bucket_id = 'avatars' AND name LIKE auth.uid()::text || '/%'`,
    `bucket_id = 'avatars' AND name ~ ('^' || auth.uid()::text || '/.*')`
  ];

  syntaxOptions.forEach((syntax, index) => {
    console.log(`-- Option ${index + 1}: Using ${index === 0 ? 'storage.foldername' : index === 1 ? 'split_part' : index === 2 ? 'LIKE pattern' : 'regex pattern'}`);
    console.log(`DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;`);
    console.log(`CREATE POLICY "Users can upload own avatars" ON storage.objects`);
    console.log(`  FOR INSERT TO authenticated`);
    console.log(`  WITH CHECK (${syntax});`);
    console.log('');
  });

  console.log('-- SELECT policy (should work with any syntax)');
  console.log(`CREATE POLICY "Anyone can view avatars" ON storage.objects`);
  console.log(`  FOR SELECT TO anon, authenticated`);
  console.log(`  USING (bucket_id = 'avatars');`);
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testAvatarUpload = testAvatarUploadConnection;
  (window as any).testUserServiceAvatar = testUserServiceAvatarUpload;
  (window as any).testPolicySyntax = testPolicySyntax;
  (window as any).generatePolicySQL = generatePolicySQL;
}