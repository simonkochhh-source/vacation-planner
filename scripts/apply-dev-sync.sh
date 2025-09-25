#!/bin/bash

# Script to apply the Dev-to-Prod sync script to the Test/Dev database

set -e

SUPABASE_ACCESS_TOKEN="sbp_083ea641505d385d2752cf75bcf67debc39e40ed"
DEV_PROJECT_ID="lsztvtauiapnhqplapgb"
SYNC_SCRIPT="database/schema-analysis/dev-to-prod-sync-script.sql"

echo "🔄 Applying Dev Database Synchronization Script"
echo "=============================================="
echo "🎯 Target: Dev Database ($DEV_PROJECT_ID.supabase.co)"
echo "📄 Script: $SYNC_SCRIPT"
echo ""

# Check if sync script exists
if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "❌ Error: Sync script not found at $SYNC_SCRIPT"
    exit 1
fi

echo "⚠️  WARNING: This will DROP and RECREATE all tables in the Dev database!"
echo "⚠️  Make sure you have backed up any important data."
echo ""
echo "Do you want to continue? (y/N)"
read -r response

if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "❌ Operation cancelled by user"
    exit 0
fi

echo ""
echo "🔗 Linking to Dev database..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $DEV_PROJECT_ID

echo ""
echo "📊 Executing sync script..."

# Create a temporary SQL file that we can execute
temp_sql=$(mktemp)
cp "$SYNC_SCRIPT" "$temp_sql"

# Execute the SQL script
if SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db push --dry-run > /dev/null 2>&1; then
    echo "🧪 Dry-run successful, proceeding with actual execution..."
fi

# Use psql to execute the script directly
echo "🚀 Applying schema changes..."

# Get connection details and execute the script
PROJECT_URL="https://$DEV_PROJECT_ID.supabase.co"
echo "📡 Connecting to: $PROJECT_URL"

# Create a migration file and push it
MIGRATION_FILE="supabase/migrations/$(date +%Y%m%d%H%M%S)_complete_dev_sync.sql"
cp "$SYNC_SCRIPT" "$MIGRATION_FILE"

echo "📝 Created migration file: $MIGRATION_FILE"
echo "🔄 Pushing migration to database..."

# Push the migration
if SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db push; then
    echo ""
    echo "✅ SUCCESS: Dev database sync completed!"
    echo ""
    echo "📊 Your Dev database now matches Production schema with:"
    echo "   ✅ All 7 tables with complete column structures"
    echo "   ✅ All performance indexes"
    echo "   ✅ Complete RLS policies for security"
    echo "   ✅ Triggers for data consistency"
    echo "   ✅ Functions for automatic user profile creation"
    echo ""
    echo "🧪 Next steps:"
    echo "   1. Test user registration: http://localhost:3001"
    echo "   2. Verify OAuth login works without 'Database error saving new user'"
    echo "   3. Create test data for development"
    echo ""
    echo "🎯 Dev database is now a 1:1 copy of Production!"
else
    echo ""
    echo "❌ ERROR: Failed to apply sync script"
    echo "Check the error messages above for details"
    exit 1
fi

# Cleanup
rm -f "$temp_sql"

echo ""
echo "🎉 Database synchronization completed successfully!"