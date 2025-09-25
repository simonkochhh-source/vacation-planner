#!/bin/bash

# Switch React App to Test Database
# This script switches from Production DB to Test DB for localhost:3001 testing

echo "🔄 Switching to Test Database Configuration..."

# Backup current .env
if [ -f .env ]; then
    echo "📦 Backing up current .env to .env.production.backup"
    cp .env .env.production.backup
fi

# Copy .env.local (test config) to .env
if [ -f .env.local ]; then
    echo "🔧 Copying Test DB configuration from .env.local to .env"
    cp .env.local .env
    echo "✅ Test database configuration activated"
    
    echo ""
    echo "📋 Current configuration:"
    echo "Database URL: $(grep REACT_APP_SUPABASE_URL .env)"
    echo "Test Database: lsztvtauiapnhqplapgb.supabase.co"
    echo ""
    
    echo "🚀 Restart your development server for changes to take effect:"
    echo "   npm start"
    echo ""
    
    echo "🔍 To verify the switch worked, check browser console for:"
    echo "   'Supabase URL: https://lsztvtauiapnhqplapgb...'"
    
else
    echo "❌ Error: .env.local (test config) not found!"
    echo "Expected test database configuration in .env.local"
    exit 1
fi

echo ""
echo "📝 To switch back to Production later:"
echo "   cp .env.production.backup .env"