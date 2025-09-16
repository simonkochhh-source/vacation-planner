-- Get your current user_id
-- Run this in Supabase SQL Editor while you're logged into the app

-- Method 1: Get current authenticated user ID
SELECT auth.uid() as my_user_id;

-- Method 2: Get user info with email (if needed)
SELECT 
    auth.uid() as user_id,
    auth.email() as email,
    auth.jwt() ->> 'email' as jwt_email;

-- Method 3: Show all users in auth.users table (for reference)
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;