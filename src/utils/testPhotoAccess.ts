// Test Photo Access Functionality
// This tests the actual PhotoService methods used by the app

import { PhotoService } from '../services/photoService';
import { supabase } from '../lib/supabase';

interface TestResult {
  testName: string;
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

export class PhotoAccessTester {
  
  static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    console.log('🧪 Starting Photo Access Tests...');
    
    // Test 1: Check if user is authenticated
    results.push(await this.testAuthenticationStatus());
    
    // Test 2: Test public photo access
    results.push(await this.testPublicPhotoAccess());
    
    // Test 3: Test PhotoService.getPublicPhotosForTrip()
    results.push(await this.testPhotoServicePublicPhotos());
    
    // Test 4: Test photo URL generation
    results.push(await this.testPhotoUrlGeneration());
    
    // Test 5: Test RLS policies by attempting direct queries
    results.push(await this.testDirectDatabaseAccess());
    
    // Print summary
    this.printTestSummary(results);
    
    return results;
  }
  
  static async testAuthenticationStatus(): Promise<TestResult> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      return {
        testName: 'Authentication Status',
        success: true,
        data: { 
          userId: user?.id || 'anonymous', 
          isAuthenticated: !!user 
        },
        message: user ? `Authenticated as ${user.email}` : 'Anonymous user'
      };
    } catch (error) {
      return {
        testName: 'Authentication Status',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to check auth status'
      };
    }
  }
  
  static async testPublicPhotoAccess(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select(`
          id,
          file_name,
          privacy,
          caption,
          storage_path,
          trips!inner(id, name, privacy)
        `)
        .eq('privacy', 'public')
        .eq('trips.privacy', 'public')
        .limit(5);
      
      if (error) throw error;
      
      return {
        testName: 'Public Photo Database Access',
        success: true,
        data: data,
        message: `Found ${data.length} public photos from public trips`
      };
    } catch (error) {
      return {
        testName: 'Public Photo Database Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to access public photos'
      };
    }
  }
  
  static async testPhotoServicePublicPhotos(): Promise<TestResult> {
    try {
      // First, get a public trip ID
      const { data: trips, error: tripError } = await supabase
        .from('trips')
        .select('id, name')
        .eq('privacy', 'public')
        .limit(1);
      
      if (tripError) throw tripError;
      if (!trips || trips.length === 0) {
        throw new Error('No public trips found for testing');
      }
      
      const testTripId = trips[0].id;
      
      // Test PhotoService method
      const photos = await PhotoService.getPublicPhotosForTrip(testTripId);
      
      return {
        testName: 'PhotoService.getPublicPhotosForTrip()',
        success: true,
        data: { 
          tripId: testTripId, 
          tripName: trips[0].name,
          photoCount: photos.length,
          photos: photos.slice(0, 3) // Show first 3 photos
        },
        message: `PhotoService returned ${photos.length} public photos for trip "${trips[0].name}"`
      };
    } catch (error) {
      return {
        testName: 'PhotoService.getPublicPhotosForTrip()',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'PhotoService method failed'
      };
    }
  }
  
  static async testPhotoUrlGeneration(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('trip_photos')
        .select('id, file_name, storage_path')
        .eq('privacy', 'public')
        .limit(1);
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No public photos found for URL testing');
      }
      
      const photo = data[0];
      const { data: urlData } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(photo.storage_path);
      
      return {
        testName: 'Photo URL Generation',
        success: true,
        data: {
          photoId: photo.id,
          fileName: photo.file_name,
          storagePath: photo.storage_path,
          publicUrl: urlData.publicUrl
        },
        message: `Successfully generated URL for ${photo.file_name}`
      };
    } catch (error) {
      return {
        testName: 'Photo URL Generation',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to generate photo URL'
      };
    }
  }
  
  static async testDirectDatabaseAccess(): Promise<TestResult> {
    try {
      // Test if we can access trip_photos table directly
      const { data, error, count } = await supabase
        .from('trip_photos')
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) throw error;
      
      return {
        testName: 'Direct Database Access',
        success: true,
        data: { 
          totalPhotosVisible: count,
          hasAccess: true
        },
        message: `Can access trip_photos table. Total visible photos: ${count}`
      };
    } catch (error) {
      return {
        testName: 'Direct Database Access',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Cannot access trip_photos table - RLS may be blocking'
      };
    }
  }
  
  static printTestSummary(results: TestResult[]): void {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total: ${results.length}`);
    
    console.log('\nDetailed Results:');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.testName}: ${result.message}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.data && result.success) {
        console.log(`   Data:`, result.data);
      }
    });
  }
}

// Export test function for console access
(window as any).testPhotoAccess = PhotoAccessTester.runAllTests;