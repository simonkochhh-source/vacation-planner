#!/usr/bin/env node

/**
 * Supabase Storage Configuration Extractor via SQL
 * Uses direct SQL queries to extract storage buckets and policies
 */

const { createClient } = require('@supabase/supabase-js');

// Database configurations
const PRODUCTION_URL = 'https://kyzbtkkprvegzgzrlhez.supabase.co';
const DEV_URL = 'https://lsztvtauiapnhqplapgb.supabase.co';
const SERVICE_ROLE_KEY = 'sbp_083ea641505d385d2752cf75bcf67debc39e40ed';

// Create Supabase clients with service role (bypass RLS)
const prodClient = createClient(PRODUCTION_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const devClient = createClient(DEV_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Extract storage configuration via SQL queries
 */
async function extractStorageConfig(client, envName) {
  console.log(`\n🔍 Extracting storage configuration from ${envName}...`);
  
  const results = {
    buckets: [],
    bucket_policies: [],
    rls_policies: [],
    migrations: [],
    errors: []
  };
  
  try {
    // 1. Get storage buckets from storage.buckets table
    console.log(`   📁 Querying storage.buckets...`);
    const { data: buckets, error: bucketsError } = await client
      .from('storage.buckets')
      .select('*');
    
    if (bucketsError) {
      console.log(`   ⚠️  Buckets query failed: ${bucketsError.message}`);
      results.errors.push(`buckets: ${bucketsError.message}`);
    } else {
      results.buckets = buckets || [];
      console.log(`   ✅ Found ${results.buckets.length} buckets`);
    }
    
    // 2. Get storage policies
    console.log(`   🔒 Querying storage policies...`);
    const { data: policies, error: policiesError } = await client
      .from('storage.policies')
      .select('*');
    
    if (policiesError) {
      console.log(`   ⚠️  Policies query failed: ${policiesError.message}`);
      results.errors.push(`policies: ${policiesError.message}`);
    } else {
      results.bucket_policies = policies || [];
      console.log(`   ✅ Found ${results.bucket_policies.length} bucket policies`);
    }
    
    // 3. Get RLS policies for storage-related tables
    console.log(`   🔐 Querying RLS policies...`);
    try {
      const { data: rlsPolicies, error: rlsError } = await client
        .rpc('pg_policies_query', {
          query_text: `
            SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
            FROM pg_policies 
            WHERE schemaname = 'storage' OR tablename LIKE '%storage%' OR tablename LIKE '%bucket%';
          `
        })
        .catch(async () => {
          // Fallback: try direct query if RPC doesn't exist
          return await client
            .from('information_schema.tables')
            .select('*')
            .eq('table_schema', 'storage')
            .then(tablesResult => {
              return { data: tablesResult.data || [], error: null };
            });
        });
      
      if (rlsError) {
        console.log(`   ⚠️  RLS policies query failed: ${rlsError.message}`);
        results.errors.push(`rls_policies: ${rlsError.message}`);
      } else {
        results.rls_policies = rlsPolicies || [];
        console.log(`   ✅ Found ${results.rls_policies.length} RLS policies`);
      }
    } catch (rlsException) {
      console.log(`   ⚠️  RLS policies exception: ${rlsException.message}`);
      results.errors.push(`rls_policies_exception: ${rlsException.message}`);
    }
    
    // 4. Check for storage-related migrations
    console.log(`   📋 Querying migration history...`);
    const { data: migrations, error: migrationsError } = await client
      .from('supabase_migrations.schema_migrations')
      .select('*')
      .or('version.like.%storage%,statements.ilike.%storage%,statements.ilike.%bucket%')
      .catch(() => ({ data: [], error: { message: 'Migrations table not accessible' } }));
    
    if (migrationsError) {
      console.log(`   ⚠️  Migrations query failed: ${migrationsError.message}`);
      results.errors.push(`migrations: ${migrationsError.message}`);
    } else {
      results.migrations = migrations || [];
      console.log(`   ✅ Found ${results.migrations.length} storage-related migrations`);
    }
    
    // 5. Try to get storage schema information
    console.log(`   🗄️  Querying storage schema...`);
    const { data: storageSchema, error: schemaError } = await client
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'storage');
    
    if (schemaError) {
      console.log(`   ⚠️  Storage schema query failed: ${schemaError.message}`);
      results.errors.push(`storage_schema: ${schemaError.message}`);
    } else {
      results.storage_schema = storageSchema || [];
      console.log(`   ✅ Found ${results.storage_schema.length} storage schema tables`);
    }
    
  } catch (error) {
    console.error(`   ❌ Exception in ${envName}:`, error.message);
    results.errors.push(`exception: ${error.message}`);
  }
  
  return results;
}

/**
 * Generate storage migration SQL
 */
function generateStorageMigrationSQL(prodConfig, devConfig) {
  console.log('\n📝 Generating storage migration SQL...');
  
  const sql = [];
  
  sql.push('-- Supabase Storage Configuration Migration');
  sql.push('-- Generated: ' + new Date().toISOString());
  sql.push('-- Purpose: Sync storage buckets and policies from Production to Dev');
  sql.push('');
  
  // Check if we need to enable storage extension
  sql.push('-- Enable storage extension (if not already enabled)');
  sql.push('CREATE EXTENSION IF NOT EXISTS "supabase_storage" WITH SCHEMA storage;');
  sql.push('');
  
  // Create buckets
  const prodBuckets = prodConfig.buckets || [];
  const devBuckets = devConfig.buckets || [];
  const devBucketNames = devBuckets.map(b => b.name);
  
  if (prodBuckets.length > 0) {
    sql.push('-- Create storage buckets');
    
    for (const bucket of prodBuckets) {
      if (!devBucketNames.includes(bucket.name)) {
        sql.push(`-- Create bucket: ${bucket.name}`);
        sql.push(`INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types, created_at, updated_at)`);
        sql.push(`VALUES (`);
        sql.push(`  '${bucket.id}',`);
        sql.push(`  '${bucket.name}',`);
        sql.push(`  ${bucket.owner ? `'${bucket.owner}'` : 'NULL'},`);
        sql.push(`  ${bucket.public},`);
        sql.push(`  ${bucket.file_size_limit || 'NULL'},`);
        sql.push(`  ${bucket.allowed_mime_types ? `'${JSON.stringify(bucket.allowed_mime_types)}'::jsonb` : 'NULL'},`);
        sql.push(`  '${bucket.created_at}',`);
        sql.push(`  '${bucket.updated_at}'`);
        sql.push(`) ON CONFLICT (name) DO UPDATE SET`);
        sql.push(`  public = EXCLUDED.public,`);
        sql.push(`  file_size_limit = EXCLUDED.file_size_limit,`);
        sql.push(`  allowed_mime_types = EXCLUDED.allowed_mime_types,`);
        sql.push(`  updated_at = NOW();`);
        sql.push('');
      }
    }
  } else {
    sql.push('-- No storage buckets found in production');
    sql.push('-- Common vacation planner storage buckets:');
    sql.push('');
    
    // Add common buckets for vacation planner
    const commonBuckets = [
      {
        name: 'avatars',
        public: true,
        description: 'User profile avatars and photos'
      },
      {
        name: 'trip-photos',
        public: false,
        description: 'Private trip and destination photos'
      },
      {
        name: 'destination-images',
        public: true,
        description: 'Public destination and location images'
      },
      {
        name: 'documents',
        public: false,
        description: 'User documents and attachments'
      }
    ];
    
    sql.push('-- Create common vacation planner storage buckets');
    for (const bucket of commonBuckets) {
      sql.push(`-- ${bucket.description}`);
      sql.push(`INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)`);
      sql.push(`VALUES (`);
      sql.push(`  '${bucket.name}',`);
      sql.push(`  '${bucket.name}',`);
      sql.push(`  ${bucket.public},`);
      
      if (bucket.name === 'avatars') {
        sql.push(`  5242880, -- 5MB limit for avatars`);
        sql.push(`  '["image/jpeg", "image/png", "image/webp"]'::jsonb`);
      } else if (bucket.name === 'trip-photos') {
        sql.push(`  10485760, -- 10MB limit for trip photos`);
        sql.push(`  '["image/jpeg", "image/png", "image/webp", "image/gif"]'::jsonb`);
      } else if (bucket.name === 'destination-images') {
        sql.push(`  10485760, -- 10MB limit for destination images`);
        sql.push(`  '["image/jpeg", "image/png", "image/webp"]'::jsonb`);
      } else {
        sql.push(`  52428800, -- 50MB limit for documents`);
        sql.push(`  '["application/pdf", "image/jpeg", "image/png", "text/plain"]'::jsonb`);
      }
      
      sql.push(`) ON CONFLICT (name) DO NOTHING;`);
      sql.push('');
    }
  }
  
  // Create storage policies
  const prodPolicies = prodConfig.bucket_policies || [];
  
  if (prodPolicies.length > 0) {
    sql.push('-- Storage bucket policies');
    
    for (const policy of prodPolicies) {
      sql.push(`-- Policy: ${policy.name} for bucket ${policy.bucket_id}`);
      sql.push(`INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, using_expression)`);
      sql.push(`VALUES (`);
      sql.push(`  '${policy.id}',`);
      sql.push(`  '${policy.bucket_id}',`);
      sql.push(`  '${policy.name}',`);
      sql.push(`  '${policy.definition || ''}',`);
      sql.push(`  '${policy.check || 'true'}',`);
      sql.push(`  '${policy.using || 'true'}'`);
      sql.push(`) ON CONFLICT (bucket_id, name) DO NOTHING;`);
      sql.push('');
    }
  } else {
    sql.push('-- No existing storage policies found');
    sql.push('-- Create basic RLS policies for storage buckets:');
    sql.push('');
    
    // Add common storage policies
    sql.push('-- Avatar upload policy (authenticated users can upload their own avatar)');
    sql.push(`CREATE POLICY "Users can upload avatars" ON storage.objects`);
    sql.push(`FOR INSERT WITH CHECK (`);
    sql.push(`  bucket_id = 'avatars' AND`);
    sql.push(`  auth.uid()::text = (storage.foldername(name))[1]`);
    sql.push(`);`);
    sql.push('');
    
    sql.push('-- Avatar view policy (everyone can view avatars)');
    sql.push(`CREATE POLICY "Avatars are publicly viewable" ON storage.objects`);
    sql.push(`FOR SELECT USING (bucket_id = 'avatars');`);
    sql.push('');
    
    sql.push('-- Trip photo upload policy (users can upload to their own trips)');
    sql.push(`CREATE POLICY "Users can upload trip photos" ON storage.objects`);
    sql.push(`FOR INSERT WITH CHECK (`);
    sql.push(`  bucket_id = 'trip-photos' AND`);
    sql.push(`  auth.uid()::text = (storage.foldername(name))[1]`);
    sql.push(`);`);
    sql.push('');
    
    sql.push('-- Trip photo view policy (users can view their own trip photos)');
    sql.push(`CREATE POLICY "Users can view their trip photos" ON storage.objects`);
    sql.push(`FOR SELECT USING (`);
    sql.push(`  bucket_id = 'trip-photos' AND`);
    sql.push(`  auth.uid()::text = (storage.foldername(name))[1]`);
    sql.push(`);`);
    sql.push('');
    
    sql.push('-- Public destination images (everyone can view)');
    sql.push(`CREATE POLICY "Destination images are publicly viewable" ON storage.objects`);
    sql.push(`FOR SELECT USING (bucket_id = 'destination-images');`);
    sql.push('');
    
    sql.push('-- Destination image upload (authenticated users only)');
    sql.push(`CREATE POLICY "Authenticated users can upload destination images" ON storage.objects`);
    sql.push(`FOR INSERT WITH CHECK (`);
    sql.push(`  bucket_id = 'destination-images' AND`);
    sql.push(`  auth.role() = 'authenticated'`);
    sql.push(`);`);
    sql.push('');
  }
  
  return sql.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Supabase Storage Configuration Analysis (via SQL)...\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    production: {
      url: PRODUCTION_URL,
      ...{}
    },
    dev: {
      url: DEV_URL,
      ...{}
    },
    analysis: {
      buckets_match: false,
      missing_in_dev: [],
      missing_in_prod: [],
      recommendations: []
    }
  };
  
  // Extract from Production
  console.log('📊 PRODUCTION DATABASE ANALYSIS');
  console.log('================================');
  results.production = await extractStorageConfig(prodClient, 'Production');
  
  // Extract from Dev  
  console.log('\n📊 DEV DATABASE ANALYSIS');
  console.log('=========================');
  results.dev = await extractStorageConfig(devClient, 'Dev');
  
  // Analysis
  console.log('\n📋 STORAGE CONFIGURATION COMPARISON');
  console.log('====================================');
  
  const prodBuckets = results.production.buckets || [];
  const devBuckets = results.dev.buckets || [];
  
  const prodBucketNames = prodBuckets.map(b => b.name);
  const devBucketNames = devBuckets.map(b => b.name);
  
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
  
  // Generate recommendations
  if (prodBuckets.length === 0 && devBuckets.length === 0) {
    results.analysis.recommendations.push('No storage buckets found in either environment');
    results.analysis.recommendations.push('Consider creating common vacation planner buckets: avatars, trip-photos, destination-images, documents');
  }
  
  // Generate migration SQL
  const migrationSQL = generateStorageMigrationSQL(results.production, results.dev);
  
  // Save results
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  
  const resultsFile = `database/schema-analysis/storage-analysis-${timestamp}.json`;
  const sqlFile = `database/schema-analysis/storage-sync-${timestamp}.sql`;
  
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  fs.writeFileSync(sqlFile, migrationSQL);
  
  console.log(`\n💾 Results saved to:`);
  console.log(`   📄 Analysis: ${resultsFile}`);
  console.log(`   📜 SQL Script: ${sqlFile}`);
  
  return results;
}

// Run the analysis
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

module.exports = { extractStorageConfig, generateStorageMigrationSQL, main };