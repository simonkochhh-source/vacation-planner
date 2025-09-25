#!/bin/bash

echo "🔍 CURRENT OAUTH CONFIGURATION ANALYSIS"
echo "========================================"
echo ""

echo "📁 Environment Files:"
echo "---------------------"
if [ -f .env ]; then
    echo "✅ .env exists (CURRENTLY ACTIVE)"
    echo "   Database: $(grep REACT_APP_SUPABASE_URL .env | cut -d'=' -f2)"
    CURRENT_DB=$(grep REACT_APP_SUPABASE_URL .env | cut -d'=' -f2)
    if [[ $CURRENT_DB == *"kyzbtkkprvegzgzrlhez"* ]]; then
        echo "   🏭 Type: PRODUCTION DATABASE"
        echo "   ✅ OAuth Status: Working (as confirmed)"
    elif [[ $CURRENT_DB == *"lsztvtauiapnhqplapgb"* ]]; then
        echo "   🧪 Type: TEST/DEV DATABASE" 
        echo "   ❌ OAuth Status: Failing (needs fix)"
    else
        echo "   ❓ Type: Unknown database"
    fi
else
    echo "❌ .env missing"
fi

echo ""

if [ -f .env.local ]; then
    echo "✅ .env.local exists (TEST CONFIG)"
    echo "   Database: $(grep REACT_APP_SUPABASE_URL .env.local | cut -d'=' -f2)"
    TEST_DB=$(grep REACT_APP_SUPABASE_URL .env.local | cut -d'=' -f2)
    if [[ $TEST_DB == *"lsztvtauiapnhqplapgb"* ]]; then
        echo "   🧪 Type: TEST/DEV DATABASE"
        echo "   ❌ OAuth Status: Failing (this is what needs fixing)"
    fi
else
    echo "❌ .env.local missing"
fi

echo ""

if [ -f .env.backup ]; then
    echo "✅ .env.backup exists (PRODUCTION BACKUP)"
    echo "   Database: $(grep REACT_APP_SUPABASE_URL .env.backup | cut -d'=' -f2)"
else
    echo "ℹ️  .env.backup not found"
fi

echo ""
echo "🎯 PROBLEM DIAGNOSIS:"
echo "--------------------"
if [[ $CURRENT_DB == *"kyzbtkkprvegzgzrlhez"* ]]; then
    echo "❌ ISSUE: Your app is using PRODUCTION database"
    echo "   - Production OAuth works fine"
    echo "   - But you want to test on TEST database"  
    echo "   - Need to switch to .env.local configuration"
    echo ""
    echo "💡 SOLUTION: Run ./scripts/switch-to-test-db.sh"
elif [[ $CURRENT_DB == *"lsztvtauiapnhqplapgb"* ]]; then
    echo "✅ GOOD: App is using TEST database"
    echo "❌ ISSUE: OAuth not configured in TEST database"
    echo ""
    echo "💡 SOLUTION: Configure OAuth in Test database Dashboard"
else
    echo "❓ UNCLEAR: Cannot determine current database type"
fi

echo ""
echo "📋 NEXT STEPS:"
echo "--------------"
echo "1. Switch to test database: ./scripts/switch-to-test-db.sh"
echo "2. Run diagnostics: Copy database/oauth-diagnostics.sql to Supabase SQL Editor"
echo "3. Apply fixes: Copy database/fix-test-oauth.sql to Supabase SQL Editor" 
echo "4. Configure OAuth: Enable Google OAuth in Test database Dashboard"
echo "5. Test OAuth: Try logging in at localhost:3001"
echo ""
echo "📖 Full guide: See OAUTH-FIX-STRATEGY.md"