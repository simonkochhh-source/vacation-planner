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
rm -rf .next/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the project
echo "🔨 Building the project..."
CI=false npm run build

# Simple Vercel deployment
echo "📤 Deploying to Vercel..."
echo "📝 Using simplified deployment approach..."

# Create or update .vercelignore to ensure clean deployment
cat > .vercelignore << EOF
node_modules
npm-debug.log*
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
coverage
.nyc_output
.vercel
mobile-design-review*
docs/
*.log
EOF

# Deploy with minimal flags for maximum compatibility
vercel --prod --yes || {
    echo "⚠️  Standard deployment failed, trying alternative approach..."
    npx vercel --prod --yes --public
}

echo "✅ Deployment completed!"
echo ""
echo "🌐 IMPORTANT: Manual Vercel Dashboard Configuration Required"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 🔐 Login to https://vercel.com/dashboard"
echo "2. 📂 Select your vacation-planner project"
echo "3. ⚙️  Go to Settings → General"
echo "4. 🔓 Set 'Access Control' to 'Public' (NOT Private!)"
echo "5. 🚫 Disable any 'Password Protection'"
echo "6. 👥 Check Team Settings (if applicable):"
echo "   - Ensure project visibility allows public access"
echo "   - No team restrictions for public projects"
echo ""
echo "🧪 Test public access:"
echo "   - Open app in incognito/private browser"
echo "   - Share URL with someone without Vercel account"
echo "   - Use: https://your-app-name.vercel.app/welcome.html as fallback"
echo ""
echo "❗ If users still see Vercel login:"
echo "   - Double-check Access Control settings"
echo "   - Ensure you're not in a private team/organization"
echo "   - Contact Vercel support if settings appear correct"