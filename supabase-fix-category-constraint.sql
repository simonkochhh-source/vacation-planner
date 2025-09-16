-- Fix category constraint to match app's DestinationCategory enum
-- Remove existing constraint and add updated one with all valid categories

-- Drop the existing check constraint
ALTER TABLE destinations DROP CONSTRAINT IF EXISTS destinations_category_check;

-- Add new constraint with all valid category values (English from app + German from original schema)
ALTER TABLE destinations ADD CONSTRAINT destinations_category_check 
CHECK (category IN (
  -- English categories from app
  'museum',
  'restaurant', 
  'attraction',
  'hotel',
  'transport',
  'nature',
  'entertainment',
  'shopping',
  'cultural',
  'sports',
  'other',
  -- German categories from original schema
  'sehenswuerdigkeit',
  'aktivitaet',
  'nachtleben',
  'natur',
  'kultur',
  'sport',
  'wellness',
  'business',
  'sonstiges'
));

-- Map German categories to English equivalents for consistency
UPDATE destinations SET category = 
  CASE 
    WHEN category = 'sehenswuerdigkeit' THEN 'attraction'
    WHEN category = 'aktivitaet' THEN 'entertainment'
    WHEN category = 'nachtleben' THEN 'entertainment'
    WHEN category = 'natur' THEN 'nature'
    WHEN category = 'kultur' THEN 'cultural'
    WHEN category = 'sport' THEN 'sports'
    WHEN category = 'wellness' THEN 'entertainment'
    WHEN category = 'business' THEN 'other'
    WHEN category = 'sonstiges' THEN 'other'
    ELSE category
  END
WHERE category IN ('sehenswuerdigkeit', 'aktivitaet', 'nachtleben', 'natur', 'kultur', 'sport', 'wellness', 'business', 'sonstiges');