/**
 * Script to migrate schema to Test Database
 * This script applies the complete schema to the test database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Database Configuration
const SUPABASE_URL = 'https://lsztvtauiapnhqplapgb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzenR2dGF1aWFwbmhxcGxhcGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTQ5NjksImV4cCI6MjA3NDIzMDk2OX0.e2C8UtbCHc18r_BwMcAoZscNA_hbwEbeGmC764rlloY';

// You need to replace this with your service role key for schema operations
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

async function migrateSchema() {
  console.log('🚀 Starting Test Database Schema Migration...');
  
  // Create Supabase client with service role key for schema operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the complete schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'complete_test_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Schema file loaded successfully');
    console.log(`📄 Schema length: ${schemaSQL.length} characters`);
    
    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length === 0) continue;
      
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📄 Statement preview: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log(`📊 Result:`, data);
          }
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err);
        errorCount++;
      }
      
      // Add a small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Schema migration completed successfully!');
    } else {
      console.log('\n⚠️  Schema migration completed with some errors. Please check the logs above.');
    }
    
  } catch (error) {
    console.error('💥 Fatal error during schema migration:', error);
    process.exit(1);
  }
}

// Alternative: Direct SQL execution function for Supabase CLI
async function executeSchemaWithCLI() {
  console.log('🔧 Alternative: Using Supabase CLI for schema migration...');
  console.log('');
  console.log('Please run the following commands manually:');
  console.log('');
  console.log('1. First, make sure you are linked to the test database:');
  console.log(`   SUPABASE_ACCESS_TOKEN="sbp_083ea641505d385d2752cf75bcf67debc39e40ed" supabase link --project-ref lsztvtauiapnhqplapgb`);
  console.log('');
  console.log('2. Then apply the schema:');
  console.log(`   SUPABASE_ACCESS_TOKEN="sbp_083ea641505d385d2752cf75bcf67debc39e40ed" supabase db push`);
  console.log('');
  console.log('3. Or manually copy the SQL from database/complete_test_schema.sql');
  console.log('   and run it in the Supabase SQL Editor at:');
  console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`);
  console.log('');
}

// Check if service key is provided
if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.log('🔑 Service Role Key not configured.');
  executeSchemaWithCLI();
} else {
  migrateSchema();
}