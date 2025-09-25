#!/bin/bash

# Switch to Development Environment
# This script configures the app to use Dev/Test Supabase project for localhost

echo "🔄 Switching to DEVELOPMENT Environment..."
echo "=========================================="

# Backup current .env if it exists
if [ -f .env ]; then
    if [ ! -f .env.backup ]; then
        echo "📦 Backing up current .env to .env.backup"
        cp .env .env.backup
    fi
fi

# Copy development configuration to .env
echo "📝 Applying development configuration..."
cp .env.development .env

echo "✅ Environment switched to DEVELOPMENT"
echo ""
echo "📊 Active Configuration:"
echo "   Database: $(grep REACT_APP_SUPABASE_URL .env | cut -d'=' -f2)"
echo "   Environment: $(grep REACT_APP_ENVIRONMENT .env | cut -d'=' -f2)"
echo "   Stage: $(grep REACT_APP_STAGE .env | cut -d'=' -f2)"
echo ""
echo "🎯 Dev Database Features:"
echo "   • Test/Dev Supabase Project (lsztvtauiapnhqplapgb)"
echo "   • Debug Mode Enabled"
echo "   • Mock Places Enabled"  
echo "   • Development Tools Visible"
echo "   • Source Maps Generated"
echo ""
echo "🚨 IMPORTANT: OAuth needs to be configured in Dev database"
echo "   1. Go to: https://supabase.com/dashboard/project/lsztvtauiapnhqplapgb"
echo "   2. Authentication → Providers → Enable Google"
echo "   3. Add localhost:3000 and localhost:3001 to redirect URLs"
echo ""
echo "🚀 Start development server:"
echo "   npm start"
echo ""
echo "🔄 Switch back to production:"
echo "   ./scripts/env-prod.sh"