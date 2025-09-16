-- Fix Supabase category constraint to accept English values (as used by React App)

-- Drop the existing constraint
ALTER TABLE destinations DROP CONSTRAINT IF EXISTS category_check;

-- Add new constraint with English category values
ALTER TABLE destinations ADD CONSTRAINT category_check 
CHECK (category IN ('restaurant', 'museum', 'attraction', 'hotel', 'transport', 'nature', 'entertainment', 'shopping', 'cultural', 'sports', 'other'));

-- Verify the change
SELECT conname, consrc FROM pg_constraint 
WHERE conname = 'category_check' AND conrelid = 'destinations'::regclass;