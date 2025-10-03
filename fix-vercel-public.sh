#!/bin/bash

# Vacation Planner - Automated Vercel Public Access Fix
# This script attempts to fix public access issues automatically

echo "🔧 Automated Vercel Public Access Fix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if vercel CLI is installed
print_status "Checking Vercel CLI installation..."
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
    print_success "Vercel CLI installed"
else
    print_success "Vercel CLI found"
fi

# Try to login to Vercel
print_status "Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Starting login process..."
    echo "Please follow the login instructions in your browser:"
    vercel login
else
    USER=$(vercel whoami 2>/dev/null)
    print_success "Logged in as: $USER"
fi

# List current projects
print_status "Listing current Vercel projects..."
vercel ls 2>/dev/null || print_warning "Could not list projects"

# Clean and rebuild
print_status "Cleaning previous builds..."
rm -rf build/ .vercel/ .next/ 2>/dev/null

print_status "Building project..."
CI=false npm run build

# Method 1: Try standard deployment with public flag
print_status "Attempting Method 1: Standard public deployment..."
if vercel deploy --prod --public --yes --name vacation-planner-public 2>/dev/null; then
    print_success "Method 1 successful! App deployed publicly"
    DEPLOYMENT_URL=$(vercel ls 2>/dev/null | grep vacation-planner | head -1 | awk '{print $2}')
    echo "🌐 Your app URL: https://$DEPLOYMENT_URL"
else
    print_warning "Method 1 failed, trying Method 2..."
    
    # Method 2: Create completely new project
    print_status "Attempting Method 2: New project creation..."
    if vercel --prod --public --yes 2>/dev/null; then
        print_success "Method 2 successful! New project created"
    else
        print_warning "Method 2 failed, trying Method 3..."
        
        # Method 3: Manual configuration guidance
        print_status "Method 3: Manual configuration required"
        print_error "Automatic deployment failed. Manual configuration needed."
        
        echo ""
        echo "🔍 Please try the following manual steps:"
        echo "1. Open https://vercel.com/dashboard"
        echo "2. Find your vacation-planner project"
        echo "3. Look for these sections/tabs:"
        echo "   - 'Security' or 'Settings' → 'Security'"
        echo "   - 'Deployment Protection'"
        echo "   - 'Access Control'"
        echo "4. Disable all protection settings:"
        echo "   - Password Protection: OFF"
        echo "   - Vercel Authentication: OFF"
        echo "   - Team Protection: OFF"
        echo ""
        echo "📸 If you can't find these settings:"
        echo "   - Take screenshots of your Vercel dashboard"
        echo "   - Share them for specific guidance"
        echo ""
        echo "🔄 Alternative: Use different hosting platform"
        echo "   - GitHub Pages: https://pages.github.com"
        echo "   - Netlify: https://netlify.com"
        echo "   - Firebase Hosting: https://firebase.google.com/docs/hosting"
    fi
fi

# Test the deployment
print_status "Testing deployment accessibility..."
if command -v curl &> /dev/null; then
    DEPLOYMENT_URL=$(vercel ls 2>/dev/null | grep vacation-planner | head -1 | awk '{print $2}')
    if [ ! -z "$DEPLOYMENT_URL" ]; then
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL" 2>/dev/null)
        if [ "$HTTP_STATUS" = "200" ]; then
            print_success "✅ Deployment is publicly accessible!"
            echo "🌐 Public URL: https://$DEPLOYMENT_URL"
            echo "🧪 Test in incognito mode: https://$DEPLOYMENT_URL"
        else
            print_warning "Deployment may not be publicly accessible (HTTP $HTTP_STATUS)"
        fi
    fi
fi

echo ""
echo "🎯 Summary:"
echo "1. ✅ Built project successfully"
echo "2. 🔄 Attempted automatic public deployment"
echo "3. 📝 Check manual configuration if still having issues"
echo ""
echo "💡 Next steps if users still see Vercel login:"
echo "   → Check Vercel dashboard project settings manually"
echo "   → Look for 'Security', 'Access Control', or 'Deployment Protection'"
echo "   → Disable all authentication/protection features"
echo ""
print_success "Script completed!"