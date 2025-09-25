#!/usr/bin/env node

/**
 * Supabase Storage Configuration Extractor
 * Extracts storage buckets, policies, and configuration from both Production and Dev databases
 */

const { createClient } = require('@supabase/supabase-js');

// Database configurations
const PRODUCTION_URL = 'https://kyzbtkkprvegzgzrlhez.supabase.co';
const DEV_URL = 'https://lsztvtauiapnhqplapgb.supabase.co';
const ACCESS_TOKEN = 'sbp_083ea641505d385d2752cf75bcf67debc39e40ed';

// Create Supabase clients
const prodClient = createClient(PRODUCTION_URL, ACCESS_TOKEN);
const devClient = createClient(DEV_URL, ACCESS_TOKEN);

/**
 * Extract storage buckets from a Supabase client
 */
async function extractStorageBuckets(client, envName) {
  console.log(`\n🔍 Extracting storage buckets from ${envName}...`);
  
  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    
    if (error) {
      console.error(`❌ Error fetching buckets from ${envName}:`, error);
      return { buckets: [], error };
    }
    
    console.log(`✅ Found ${buckets?.length || 0} buckets in ${envName}`);
    
    // For each bucket, get detailed info
    const detailedBuckets = [];
    
    if (buckets && buckets.length > 0) {
      for (const bucket of buckets) {
        console.log(`   📁 Analyzing bucket: ${bucket.name}`);
        
        // Get bucket details
        const bucketInfo = {
          name: bucket.name,
          id: bucket.id,
          public: bucket.public,
          file_size_limit: bucket.file_size_limit,
          allowed_mime_types: bucket.allowed_mime_types,
          created_at: bucket.created_at,
          updated_at: bucket.updated_at
        };
        
        // Try to get files in bucket (just count)
        try {
          const { data: files, error: filesError } = await client.storage
            .from(bucket.name)
            .list('', { limit: 1 });
          
          bucketInfo.file_count = files ? files.length : 0;
          if (filesError && !filesError.message?.includes('not found')) {
            bucketInfo.files_error = filesError.message;
          }
        } catch (err) {
          bucketInfo.files_error = err.message;
        }
        
        // Get storage policies for this bucket
        try {
          const policies = await extractStoragePolicies(client, bucket.name, envName);
          bucketInfo.policies = policies;
        } catch (err) {
          bucketInfo.policies_error = err.message;
        }
        
        detailedBuckets.push(bucketInfo);
      }
    }
    
    return { buckets: detailedBuckets, error: null };
    
  } catch (error) {
    console.error(`❌ Exception extracting buckets from ${envName}:`, error);
    return { buckets: [], error: error.message };
  }
}

/**
 * Extract storage policies for a specific bucket
 */
async function extractStoragePolicies(client, bucketName, envName) {
  try {
    // Query the storage.policies table
    const { data: policies, error } = await client
      .from('storage.policies')
      .select('*')
      .eq('bucket_id', bucketName);
    
    if (error) {
      console.warn(`   ⚠️  Could not fetch policies for bucket ${bucketName}: ${error.message}`);
      return [];
    }
    
    return policies || [];
  } catch (error) {
    console.warn(`   ⚠️  Exception fetching policies for bucket ${bucketName}: ${error.message}`);
    return [];
  }
}

/**
 * Extract RLS policies related to storage
 */
async function extractStorageRLSPolicies(client, envName) {
  console.log(`\n🔒 Extracting storage-related RLS policies from ${envName}...`);
  
  try {
    // Query for policies on storage-related tables
    const { data: policies, error } = await client
      .rpc('get_policies', {})
      .then(result => {
        // Filter for storage-related policies
        return result?.data?.filter(policy => 
          policy.tablename?.includes('storage') || 
          policy.tablename?.includes('bucket') ||
          policy.policyname?.toLowerCase().includes('storage') ||
          policy.policyname?.toLowerCase().includes('bucket')
        ) || [];
      })
      .catch(() => {
        // If RPC doesn't exist, try direct query
        return client
          .from('pg_policies')
          .select('*')
          .or('tablename.ilike.%storage%,tablename.ilike.%bucket%,policyname.ilike.%storage%,policyname.ilike.%bucket%')
          .then(result => result.data || []);
      });
    
    if (error) {
      console.warn(`   ⚠️  Could not fetch RLS policies: ${error.message}`);
      return [];
    }
    
    console.log(`   📋 Found ${policies?.length || 0} storage-related RLS policies`);
    return policies || [];
    
  } catch (error) {
    console.warn(`   ⚠️  Exception fetching RLS policies: ${error.message}`);
    return [];
  }
}

/**
 * Main extraction function
 */
async function main() {
  console.log('🚀 Starting Supabase Storage Configuration Analysis...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    production: {
      url: PRODUCTION_URL,
      buckets: [],
      rls_policies: [],
      error: null
    },
    dev: {
      url: DEV_URL,
      buckets: [],
      rls_policies: [],
      error: null
    },
    analysis: {
      buckets_match: false,
      missing_in_dev: [],
      missing_in_prod: [],
      policy_differences: []
    }
  };
  
  // Extract from Production
  console.log('📊 PRODUCTION DATABASE ANALYSIS');
  console.log('================================');
  
  const prodResult = await extractStorageBuckets(prodClient, 'Production');
  results.production.buckets = prodResult.buckets;
  results.production.error = prodResult.error;
  
  const prodRLS = await extractStorageRLSPolicies(prodClient, 'Production');
  results.production.rls_policies = prodRLS;
  
  // Extract from Dev
  console.log('\n📊 DEV DATABASE ANALYSIS');
  console.log('=========================');
  
  const devResult = await extractStorageBuckets(devClient, 'Dev');
  results.dev.buckets = devResult.buckets;
  results.dev.error = devResult.error;
  
  const devRLS = await extractStorageRLSPolicies(devClient, 'Dev');
  results.dev.rls_policies = devRLS;
  
  // Analysis
  console.log('\n📋 STORAGE CONFIGURATION COMPARISON');
  console.log('====================================');
  
  const prodBucketNames = results.production.buckets.map(b => b.name);
  const devBucketNames = results.dev.buckets.map(b => b.name);
  
  results.analysis.missing_in_dev = prodBucketNames.filter(name => !devBucketNames.includes(name));
  results.analysis.missing_in_prod = devBucketNames.filter(name => !prodBucketNames.includes(name));
  results.analysis.buckets_match = results.analysis.missing_in_dev.length === 0 && results.analysis.missing_in_prod.length === 0;
  
  console.log(`Production buckets: ${prodBucketNames.length ? prodBucketNames.join(', ') : 'None'}`);
  console.log(`Dev buckets: ${devBucketNames.length ? devBucketNames.join(', ') : 'None'}`);
  console.log(`Buckets match: ${results.analysis.buckets_match ? '✅' : '❌'}`);
  
  if (results.analysis.missing_in_dev.length > 0) {
    console.log(`Missing in Dev: ${results.analysis.missing_in_dev.join(', ')}`);
  }
  
  if (results.analysis.missing_in_prod.length > 0) {
    console.log(`Missing in Production: ${results.analysis.missing_in_prod.join(', ')}`);
  }
  
  // Save results
  const fs = require('fs');
  const outputFile = `database/schema-analysis/storage-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${outputFile}`);
  
  return results;
}

// Run the extraction
if (require.main === module) {
  main()
    .then(results => {
      console.log('\n✅ Storage configuration analysis complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { extractStorageBuckets, extractStorageRLSPolicies, main };