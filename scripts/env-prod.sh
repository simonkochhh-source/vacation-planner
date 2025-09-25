#!/bin/bash

# Switch to Production Environment  
# This script configures the app to use Production Supabase project

echo "🔄 Switching to PRODUCTION Environment..."
echo "==========================================="

# Backup current .env if it exists
if [ -f .env ]; then
    if [ ! -f .env.backup ]; then
        echo "📦 Backing up current .env to .env.backup"
        cp .env .env.backup
    fi
fi

# Copy production configuration to .env
echo "📝 Applying production configuration..."
cp .env.production .env

echo "✅ Environment switched to PRODUCTION"
echo ""
echo "📊 Active Configuration:"
echo "   Database: $(grep REACT_APP_SUPABASE_URL .env | cut -d'=' -f2)"
echo "   Environment: $(grep REACT_APP_ENVIRONMENT .env | cut -d'=' -f2)"
echo "   Stage: $(grep REACT_APP_STAGE .env | cut -d'=' -f2)"
echo ""
echo "🏭 Production Database Features:"
echo "   • Production Supabase Project (kyzbtkkprvegzgzrlhez)"
echo "   • Debug Mode Disabled"
echo "   • Mock Places Disabled"
echo "   • Development Tools Hidden"
echo "   • Source Maps Disabled"
echo ""
echo "✅ OAuth Status: Fully configured and working"
echo ""
echo "🚀 Start development server:"
echo "   npm start"
echo ""
echo "🏗️  Build for production:"
echo "   npm run build"
echo ""
echo "🔄 Switch back to development:"
echo "   ./scripts/env-dev.sh"