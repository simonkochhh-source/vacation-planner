# OAuth User Creation Fix Strategy

## 🚨 CRITICAL ISSUE IDENTIFIED

Your React app is currently connected to **Production database** (`kyzbtkkprvegzgzrlhez.supabase.co`) instead of the **Test database** (`lsztvtauiapnhqplapgb.supabase.co`) where you're experiencing OAuth issues.

## 🔍 ROOT CAUSE ANALYSIS

### Primary Issues:
1. **Wrong Database Connection**: App uses Production DB (.env) instead of Test DB (.env.local)
2. **Missing OAuth Configuration**: Google OAuth likely not configured in Test database
3. **User Profile Creation**: Test database may lack proper user_profiles table/trigger setup

### Evidence:
- `.env` points to: `kyzbtkkprvegzgzrlhez.supabase.co` (Production - OAuth works)
- `.env.local` points to: `lsztvtauiapnhqplapgb.supabase.co` (Test - OAuth fails)
- App runs on localhost:3001 but connects to Production DB by default

## 🛠️ STEP-BY-STEP FIX STRATEGY

### Phase 1: Switch to Test Database
```bash
# Run this in your project directory:
./scripts/switch-to-test-db.sh
```

**What this does:**
- Backs up current .env to .env.production.backup
- Copies .env.local (test config) to .env
- Switches app to use Test database

### Phase 2: Database Schema Fix
1. **Open Supabase SQL Editor** for Test database (`lsztvtauiapnhqplapgb.supabase.co`)
2. **Run the diagnostic script:**
   ```sql
   -- Copy and run: database/oauth-diagnostics.sql
   ```
3. **Apply the fix script:**
   ```sql
   -- Copy and run: database/fix-test-oauth.sql
   ```

### Phase 3: OAuth Provider Configuration

#### 3.1 Access Test Database Dashboard
- Go to [supabase.com](https://supabase.com)
- Select your Test project (`lsztvtauiapnhqplapgb`)
- Navigate to **Authentication** → **Providers**

#### 3.2 Enable Google OAuth
1. **Click on Google Provider**
2. **Enable "Sign in with Google"**
3. **Configure OAuth Settings:**
   - **Client ID**: Copy from Production database settings or Google Cloud Console
   - **Client Secret**: Copy from Production database settings or Google Cloud Console
   - **Redirect URL**: Should be `https://lsztvtauiapnhqplapgb.supabase.co/auth/v1/callback`

#### 3.3 Site URL Configuration
1. Go to **Authentication** → **Settings**
2. **Site URL**: Set to `http://localhost:3001`
3. **Additional redirect URLs**: Add `http://localhost:3001/dashboard`

### Phase 4: Google Cloud Console Configuration

If you need to create new OAuth credentials:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Select your project or create new one**
3. **Enable Google+ API** (or Google Identity API)
4. **Go to Credentials** → **Create OAuth 2.0 Client ID**
5. **Set Application Type**: Web application
6. **Authorized redirect URIs**:
   ```
   https://lsztvtauiapnhqplapgb.supabase.co/auth/v1/callback
   ```
7. **Copy Client ID and Secret** to Supabase Test database settings

### Phase 5: Testing and Verification

#### 5.1 Restart Development Server
```bash
# Kill current server (Ctrl+C) and restart
npm start
```

#### 5.2 Verify Database Connection
- Open browser console at `http://localhost:3001`
- Look for: `Supabase URL: https://lsztvtauiapnhqplapgb...`
- Should NOT show `kyzbtkkprvegzgzrlhez` (Production)

#### 5.3 Test OAuth Flow
1. Navigate to login page
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Check browser console for errors
5. Verify user profile creation in Test database

## 🔧 DIAGNOSTIC TOOLS CREATED

### 1. Database Diagnostics
- **File**: `database/oauth-diagnostics.sql`
- **Purpose**: Check Test database configuration
- **Run in**: Test database SQL Editor

### 2. Environment Comparison
- **File**: `database/production-vs-test-comparison.sql`
- **Purpose**: Compare Production vs Test setup
- **Run in**: Both databases to identify differences

### 3. Database Fix Script
- **File**: `database/fix-test-oauth.sql`  
- **Purpose**: Fix user_profiles table and trigger
- **Run in**: Test database SQL Editor only

### 4. Environment Switcher
- **File**: `scripts/switch-to-test-db.sh`
- **Purpose**: Switch app to Test database
- **Run in**: Project root directory

## 📋 VERIFICATION CHECKLIST

- [ ] App connects to Test database (`lsztvtauiapnhqplapgb.supabase.co`)
- [ ] Browser console shows correct Supabase URL
- [ ] Google OAuth provider enabled in Test database Dashboard
- [ ] Site URL set to `http://localhost:3001` in Auth settings
- [ ] `user_profiles` table exists with proper structure
- [ ] `create_user_profile()` function and trigger exist
- [ ] RLS policies allow user profile creation
- [ ] OAuth flow completes without "Database error saving new user"

## 🚨 COMMON PITFALLS TO AVOID

1. **Don't test on Production**: Always use Test database for development
2. **Environment Variables**: Ensure .env points to Test database
3. **OAuth Redirect URLs**: Must match exactly in Google Cloud Console
4. **RLS Policies**: Must allow authenticated users to INSERT into user_profiles
5. **Function Permissions**: create_user_profile() needs SECURITY DEFINER

## 🎯 SUCCESS CRITERIA

**OAuth login should:**
1. Redirect to Google OAuth
2. Complete authentication
3. Redirect back to localhost:3001/dashboard
4. Create user record in auth.users
5. Create user profile in user_profiles
6. Show no "Database error saving new user" message

## 📞 NEXT STEPS IF STILL FAILING

If OAuth still fails after following this guide:

1. **Run diagnostic script** and share results
2. **Check Supabase logs** in Dashboard → Logs
3. **Verify Google Cloud Console** OAuth settings
4. **Test with Email/Password** auth as fallback
5. **Compare with working Production** configuration

## 🔄 SWITCHING BACK TO PRODUCTION

When you want to switch back to Production database:
```bash
cp .env.production.backup .env
npm start
```

---

**Priority**: HIGH - This blocks all OAuth functionality in Test environment
**Impact**: Critical - Prevents user authentication testing
**Effort**: Medium - Requires OAuth provider setup in multiple places