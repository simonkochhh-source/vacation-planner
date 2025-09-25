#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database configurations
const databases = {
  production: {
    url: 'https://kyzbtkkprvegzgzrlhez.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emJ0a2twcnZlZ3pnenJsaGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NTk4MTksImV4cCI6MjA3MzQzNTgxOX0.7povQC7Tf_8yeREtFscs9uc1ddpq5NsSP4llruueAm8'
  },
  dev: {
    url: 'https://lsztvtauiapnhqplapgb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzenR2dGF1aWFwbmhxcGxhcGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NTQ5NjksImV4cCI6MjA3NDIzMDk2OX0.e2C8UtbCHc18r_BwMcAoZscNA_hbwEbeGmC764rlloY'
  }
};

async function extractSchema(supabase, dbName) {
  console.log(`\n🔍 Extracting schema for ${dbName} database...`);
  
  const schema = {
    database: dbName,
    timestamp: new Date().toISOString(),
    tables: {},
    indexes: [],
    policies: [],
    functions: [],
    storage_buckets: []
  };

  try {
    // Get tables and columns
    console.log('  ⚡ Getting tables and columns...');
    
    // Try to get basic table information by querying known tables
    const knownTables = ['users', 'user_profiles', 'destinations', 'trips', 'trip_photos', 'user_activities', 'follows'];
    
    for (const tableName of knownTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          schema.tables[tableName] = {
            row_count: count || 0,
            exists: true
          };
          console.log(`    ✅ Table ${tableName}: ${count || 0} rows`);
        } else {
          schema.tables[tableName] = {
            exists: false,
            error: error.message,
            error_code: error.code
          };
          console.log(`    ❌ Table ${tableName}: ${error.message} (${error.code})`);
        }
      } catch (e) {
        schema.tables[tableName] = {
          exists: false,
          error: e.message
        };
        console.log(`    ❌ Table ${tableName}: ${e.message}`);
      }
    }

    // Try to get storage buckets
    console.log('  ⚡ Checking storage buckets...');
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (!bucketsError && buckets) {
        schema.storage_buckets = buckets;
        console.log(`    ✅ Found ${buckets.length} storage buckets`);
        for (const bucket of buckets) {
          console.log(`      - ${bucket.name} (public: ${bucket.public})`);
        }
      } else {
        console.log(`    ⚠️  Storage buckets error: ${bucketsError?.message || 'Unknown error'}`);
      }
    } catch (e) {
      console.log(`    ⚠️  Storage buckets: ${e.message}`);
    }

    // Try to get a sample record from each table to understand the schema
    console.log('  ⚡ Getting sample records for schema analysis...');
    for (const tableName of Object.keys(schema.tables)) {
      if (schema.tables[tableName].exists) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error && data && data.length > 0) {
            schema.tables[tableName].sample_record = data[0];
            schema.tables[tableName].columns = Object.keys(data[0]);
            console.log(`    ✅ ${tableName}: ${Object.keys(data[0]).length} columns`);
          } else if (!error && data) {
            // Table exists but is empty - try to get columns anyway
            const { data: emptyData, error: emptyError } = await supabase
              .from(tableName)
              .select('*')
              .limit(0);
            if (!emptyError) {
              schema.tables[tableName].columns = [];
              console.log(`    ℹ️  ${tableName}: Table is empty`);
            }
          }
        } catch (e) {
          console.log(`    ⚠️  ${tableName}: ${e.message}`);
        }
      }
    }

  } catch (error) {
    console.error(`❌ Error extracting schema for ${dbName}:`, error.message);
    schema.error = error.message;
  }

  return schema;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('🚀 Starting comprehensive database schema comparison...');
  console.log(`📅 Timestamp: ${timestamp}`);

  const results = {};

  // Extract schemas from both databases
  for (const [dbName, config] of Object.entries(databases)) {
    const supabase = createClient(config.url, config.key);
    results[dbName] = await extractSchema(supabase, dbName);
  }

  // Save individual schema files
  for (const [dbName, schema] of Object.entries(results)) {
    const filename = `${dbName}-schema-${timestamp}.json`;
    const filepath = path.join(__dirname, filename);
    fs.writeFileSync(filepath, JSON.stringify(schema, null, 2));
    console.log(`💾 Saved ${dbName} schema to: ${filename}`);
  }

  // Create comparison report
  console.log('\n📊 Generating comparison report...');
  const comparison = {
    timestamp: new Date().toISOString(),
    production: results.production,
    dev: results.dev,
    differences: {
      missing_tables_in_dev: [],
      extra_tables_in_dev: [],
      table_differences: {},
      storage_differences: {},
    }
  };

  // Compare tables
  const prodTables = Object.keys(results.production.tables).filter(t => results.production.tables[t].exists);
  const devTables = Object.keys(results.dev.tables).filter(t => results.dev.tables[t].exists);

  comparison.differences.missing_tables_in_dev = prodTables.filter(t => 
    !devTables.includes(t)
  );
  
  comparison.differences.extra_tables_in_dev = devTables.filter(t => 
    !prodTables.includes(t)
  );

  // Compare table structures
  for (const table of prodTables) {
    if (devTables.includes(table)) {
      const prodCols = results.production.tables[table].columns || [];
      const devCols = results.dev.tables[table].columns || [];
      
      const missingCols = prodCols.filter(c => !devCols.includes(c));
      const extraCols = devCols.filter(c => !prodCols.includes(c));
      
      if (missingCols.length > 0 || extraCols.length > 0) {
        comparison.differences.table_differences[table] = {
          missing_columns_in_dev: missingCols,
          extra_columns_in_dev: extraCols,
          production_row_count: results.production.tables[table].row_count,
          dev_row_count: results.dev.tables[table].row_count
        };
      }
    }
  }

  // Compare storage
  const prodBuckets = results.production.storage_buckets.map(b => b.name);
  const devBuckets = results.dev.storage_buckets.map(b => b.name);
  
  comparison.differences.storage_differences = {
    missing_buckets_in_dev: prodBuckets.filter(b => !devBuckets.includes(b)),
    extra_buckets_in_dev: devBuckets.filter(b => !prodBuckets.includes(b))
  };

  // Save comparison report
  const comparisonFile = `schema-comparison-${timestamp}.json`;
  const comparisonPath = path.join(__dirname, comparisonFile);
  fs.writeFileSync(comparisonPath, JSON.stringify(comparison, null, 2));
  console.log(`📋 Saved comparison report to: ${comparisonFile}`);

  // Generate summary
  console.log('\n📈 SCHEMA COMPARISON SUMMARY:');
  console.log(`   Production tables: ${prodTables.length}`);
  console.log(`   Dev tables: ${devTables.length}`);
  console.log(`   Missing in Dev: ${comparison.differences.missing_tables_in_dev.length}`);
  console.log(`   Extra in Dev: ${comparison.differences.extra_tables_in_dev.length}`);
  console.log(`   Tables with differences: ${Object.keys(comparison.differences.table_differences).length}`);
  console.log(`   Production storage buckets: ${prodBuckets.length}`);
  console.log(`   Dev storage buckets: ${devBuckets.length}`);

  if (comparison.differences.missing_tables_in_dev.length > 0) {
    console.log('\n❌ Missing tables in Dev:', comparison.differences.missing_tables_in_dev);
  }

  if (comparison.differences.extra_tables_in_dev.length > 0) {
    console.log('\n➕ Extra tables in Dev:', comparison.differences.extra_tables_in_dev);
  }

  if (Object.keys(comparison.differences.table_differences).length > 0) {
    console.log('\n⚠️  Tables with structural differences:');
    for (const [table, diffs] of Object.entries(comparison.differences.table_differences)) {
      console.log(`   ${table}:`);
      if (diffs.missing_columns_in_dev.length > 0) {
        console.log(`     Missing columns: ${diffs.missing_columns_in_dev.join(', ')}`);
      }
      if (diffs.extra_columns_in_dev.length > 0) {
        console.log(`     Extra columns: ${diffs.extra_columns_in_dev.join(', ')}`);
      }
    }
  }

  // Generate sync script if needed
  if (comparison.differences.missing_tables_in_dev.length > 0 || Object.keys(comparison.differences.table_differences).length > 0) {
    console.log('\n🔧 Generating sync script...');
    const syncScript = generateSyncScript(comparison);
    const syncFile = `sync-dev-to-prod-${timestamp}.sql`;
    fs.writeFileSync(path.join(__dirname, syncFile), syncScript);
    console.log(`📝 Saved sync script to: ${syncFile}`);
  }

  console.log('\n✅ Schema comparison complete!');
  return comparison;
}

function generateSyncScript(comparison) {
  let script = `-- Database Synchronization Script
-- Generated: ${new Date().toISOString()}
-- This script will make Dev database identical to Production

BEGIN;

`;

  // Add missing tables (this is a placeholder - actual DDL would need to be extracted)
  if (comparison.differences.missing_tables_in_dev.length > 0) {
    script += `-- WARNING: The following tables are missing in Dev:\n`;
    for (const table of comparison.differences.missing_tables_in_dev) {
      script += `-- ${table}\n`;
    }
    script += `-- You need to create these tables manually or run a full migration.\n\n`;
  }

  // Add column differences
  for (const [table, diffs] of Object.entries(comparison.differences.table_differences)) {
    if (diffs.missing_columns_in_dev.length > 0) {
      script += `-- Add missing columns to ${table}\n`;
      for (const col of diffs.missing_columns_in_dev) {
        script += `-- ALTER TABLE ${table} ADD COLUMN ${col} TYPE_UNKNOWN; -- Manual review needed\n`;
      }
      script += `\n`;
    }
    if (diffs.extra_columns_in_dev.length > 0) {
      script += `-- WARNING: ${table} has extra columns in Dev: ${diffs.extra_columns_in_dev.join(', ')}\n`;
      script += `-- Consider if these should be removed or are intentional.\n\n`;
    }
  }

  script += `-- Review and execute this script carefully
-- Some changes may require manual intervention

COMMIT;
`;

  return script;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { extractSchema, databases };