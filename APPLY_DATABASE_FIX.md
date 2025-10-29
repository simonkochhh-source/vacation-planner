# 🔧 Database Fix Required

## Problem
The like and comment functionality is failing because the database tables don't exist yet.

**Error:** `GET .../activity_comments?... 400 (Bad Request)`

## ✅ Quick Fix

1. **Open your Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Open your project: `kyzbtkkprvegzgzrlhez` 

2. **Navigate to SQL Editor:**
   - Click on "SQL Editor" in the left sidebar

3. **Run the SQL Script:**
   - Copy the entire content from `database/create_activity_tables.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Success:**
   - You should see: "Activity tables created successfully!"
   - The script will also show the table structure

## 📁 File Location
The SQL script is located at:
```
/database/create_activity_tables.sql
```

## ⚡ What This Creates
- `activity_likes` table - stores user likes on activities
- `activity_comments` table - stores user comments on activities  
- Proper indexes for performance
- Row Level Security (RLS) policies
- Foreign key constraints

## 🧪 After Running the Script
1. Refresh your app at http://localhost:3001
2. Navigate to the social activity feed
3. Try liking and commenting on posts
4. Refresh the page to verify persistence

The like and comment features should work immediately after running the SQL script!