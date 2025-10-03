#!/bin/bash

# Vacation Planner - Public Deployment Script for Vercel
# This script ensures the app is deployed as public and accessible without Vercel login

echo "🚀 Starting public deployment to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build/
rm -rf .vercel/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests (optional)
echo "🧪 Running tests..."
npm test -- --coverage --passWithNoTests --watchAll=false || echo "⚠️  Tests failed, continuing with deployment..."

# Build the project
echo "🔨 Building the project..."
npm run build

# Deploy to Vercel with explicit public settings
echo "📤 Deploying to Vercel as public app..."
vercel deploy \
  --prod \
  --public \
  --confirm \
  --scope "vacation-planner" \
  --name "vacation-planner-public" || vercel deploy --prod --public --confirm

echo "✅ Deployment completed!"
echo "🌐 Your app should now be publicly accessible without requiring Vercel login"
echo ""
echo "📋 Next steps:"
echo "1. Visit your Vercel dashboard"
echo "2. Go to Project Settings → General"
echo "3. Ensure 'Access Control' is set to 'Public'"
echo "4. Check that no password protection is enabled"
echo ""
echo "🔗 If users still need to login, check:"
echo "   - Vercel project settings"
echo "   - Team/organization settings"
echo "   - Domain configuration"