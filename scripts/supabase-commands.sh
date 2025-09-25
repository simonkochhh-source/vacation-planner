#!/bin/bash

# Supabase CLI Commands für Vacation Planner
# Vereinfacht das Management mehrerer Environments

set -e

SUPABASE_ACCESS_TOKEN="sbp_083ea641505d385d2752cf75bcf67debc39e40ed"

# Environment IDs
PROD_PROJECT_ID="kyzbtkkprvegzgzrlhez"
TEST_PROJECT_ID="lsztvtauiapnhqplapgb"

echo "🏗️  Supabase CLI Commands für Vacation Planner"
echo "=============================================="

case "$1" in
  "link-prod")
    echo "🔗 Linking to Production Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $PROD_PROJECT_ID
    echo "✅ Linked to Production: https://$PROD_PROJECT_ID.supabase.co"
    ;;
  
  "link-test")
    echo "🔗 Linking to Test Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $TEST_PROJECT_ID
    echo "✅ Linked to Test: https://$TEST_PROJECT_ID.supabase.co"
    ;;
  
  "dump-prod")
    echo "📊 Exporting Production Schema..."
    mkdir -p database/exports
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $PROD_PROJECT_ID
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db dump --schema public -f database/exports/prod-schema-$(date +%Y%m%d-%H%M%S).sql
    echo "✅ Production schema exported to database/exports/"
    ;;
  
  "push-to-test")
    echo "📤 Pushing Schema to Test Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $TEST_PROJECT_ID
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db push
    echo "✅ Schema pushed to Test Database"
    ;;
  
  "reset-test")
    echo "🔄 Resetting Test Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $TEST_PROJECT_ID
    echo "⚠️  This will reset the Test Database. Continue? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db reset --linked
      echo "✅ Test Database reset completed"
    else
      echo "❌ Reset cancelled"
    fi
    ;;
  
  "migrate-prod-to-test")
    echo "🚀 Migrating Production Schema to Test..."
    echo "Step 1: Export from Production..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $PROD_PROJECT_ID
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db dump --schema public -f database/exports/migration-$(date +%Y%m%d-%H%M%S).sql
    
    echo "Step 2: Link to Test Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase link --project-ref $TEST_PROJECT_ID
    
    echo "Step 3: Apply to Test Database..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db push
    echo "✅ Migration from Production to Test completed!"
    ;;
  
  "diff")
    echo "🔍 Comparing Local vs Remote Schema..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db diff
    ;;
  
  "status")
    echo "📊 Supabase Status:"
    echo "=================="
    echo "🔗 Current Link Status:"
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase status 2>/dev/null || echo "   No local instance running"
    echo ""
    echo "📁 Available Migrations:"
    ls -la supabase/migrations/ 2>/dev/null || echo "   No migrations found"
    echo ""
    echo "🌍 Project References:"
    echo "   Production: $PROD_PROJECT_ID (https://$PROD_PROJECT_ID.supabase.co)"
    echo "   Test:       $TEST_PROJECT_ID (https://$TEST_PROJECT_ID.supabase.co)"
    ;;
  
  "local-start")
    echo "🚀 Starting Local Supabase..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase start
    echo ""
    echo "🌐 Local Services:"
    echo "   API URL:     http://127.0.0.1:54321"
    echo "   DB URL:      postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    echo "   Studio URL:  http://127.0.0.1:54323"
    echo "   Inbucket:    http://127.0.0.1:54324"
    echo "   Anon Key:    $(supabase status | grep 'anon key' | awk '{print $3}')"
    ;;
  
  "local-stop")
    echo "🛑 Stopping Local Supabase..."
    SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase stop
    echo "✅ Local Supabase stopped"
    ;;
  
  "apply-schema")
    echo "📋 Applying Complete Schema to Current Database..."
    if [ -f "database/complete_test_schema.sql" ]; then
      # Try to apply via migrations
      mkdir -p supabase/migrations
      cp database/complete_test_schema.sql "supabase/migrations/$(date +%Y%m%d%H%M%S)_complete_schema.sql"
      SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN supabase db push
      echo "✅ Schema applied successfully"
    else
      echo "❌ Schema file not found: database/complete_test_schema.sql"
      exit 1
    fi
    ;;
  
  "help"|*)
    echo "Available Commands:"
    echo "=================="
    echo "  link-prod              - Link to Production database"
    echo "  link-test              - Link to Test database"
    echo "  dump-prod              - Export Production schema"
    echo "  push-to-test           - Push schema to Test database"
    echo "  reset-test             - Reset Test database (destructive!)"
    echo "  migrate-prod-to-test   - Complete migration from Prod to Test"
    echo "  diff                   - Compare local vs remote schema"
    echo "  status                 - Show current status"
    echo "  local-start            - Start local Supabase instance"
    echo "  local-stop             - Stop local Supabase instance"
    echo "  apply-schema           - Apply complete schema to current database"
    echo "  help                   - Show this help"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Examples:"
    echo "  $0 link-test           # Link to test environment"
    echo "  $0 migrate-prod-to-test # Full migration"
    echo "  $0 local-start         # Start local development"
    ;;
esac