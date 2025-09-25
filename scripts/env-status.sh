#!/bin/bash

# Environment Status Check
# Shows current environment configuration and provides quick switching options

echo "🔍 ENVIRONMENT STATUS CHECK"
echo "============================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ No .env file found!"
    echo "🔧 Run one of these to configure:"
    echo "   ./scripts/env-dev.sh  (for development)"
    echo "   ./scripts/env-prod.sh (for production)"
    exit 1
fi

# Read current configuration
CURRENT_DB=$(grep REACT_APP_SUPABASE_URL .env | cut -d'=' -f2)
CURRENT_ENV=$(grep REACT_APP_ENVIRONMENT .env | cut -d'=' -f2)
CURRENT_STAGE=$(grep REACT_APP_STAGE .env | cut -d'=' -f2)
DEBUG_MODE=$(grep REACT_APP_DEBUG_MODE .env | cut -d'=' -f2)

echo "📊 CURRENT CONFIGURATION:"
echo "-------------------------"
echo "   Database URL: $CURRENT_DB"
echo "   Environment: $CURRENT_ENV"
echo "   Stage: $CURRENT_STAGE"
echo "   Debug Mode: $DEBUG_MODE"
echo ""

# Determine environment type
if [[ $CURRENT_DB == *"lsztvtauiapnhqplapgb"* ]]; then
    echo "🧪 ACTIVE ENVIRONMENT: DEVELOPMENT/TEST"
    echo "   ✅ Using Dev Supabase Project"
    echo "   🎯 Perfect for localhost development"
    echo "   ⚠️  OAuth may need configuration in Dev database"
    echo ""
    echo "📋 Next Steps for OAuth Fix:"
    echo "   1. Ensure Dev database schema is migrated"
    echo "   2. Configure Google OAuth in Dev Supabase Dashboard"
    echo "   3. Test login at localhost:3001"
elif [[ $CURRENT_DB == *"kyzbtkkprvegzgzrlhez"* ]]; then
    echo "🏭 ACTIVE ENVIRONMENT: PRODUCTION"
    echo "   ✅ Using Production Supabase Project"  
    echo "   ✅ OAuth fully configured and working"
    echo "   🎯 Ready for production deployment"
else
    echo "❓ UNKNOWN ENVIRONMENT"
    echo "   ⚠️  Database URL not recognized"
fi

echo ""
echo "🔄 QUICK SWITCHING:"
echo "-------------------"
if [[ $CURRENT_ENV == "development" ]]; then
    echo "   Current: Development ✅"
    echo "   Switch to Production: ./scripts/env-prod.sh"
else
    echo "   Current: Production ✅"  
    echo "   Switch to Development: ./scripts/env-dev.sh"
fi

echo ""
echo "📁 AVAILABLE CONFIGURATIONS:"
echo "-----------------------------"
[ -f .env.development ] && echo "✅ .env.development (Dev/Test database)"
[ -f .env.production ] && echo "✅ .env.production (Production database)"
[ -f .env.local ] && echo "✅ .env.local (Local overrides)"
[ -f .env.backup ] && echo "✅ .env.backup (Previous configuration)"

echo ""
echo "🚀 START DEVELOPMENT:"
echo "--------------------"
echo "   npm start    (starts with current environment)"
echo "   npm run build (builds with current environment)"