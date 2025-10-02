-- Debug script to check auth.uid() data type
SELECT 
  auth.uid() as raw_uid,
  pg_typeof(auth.uid()) as uid_type,
  auth.uid()::TEXT as uid_as_text,
  pg_typeof(auth.uid()::TEXT) as text_type;

-- Test conversion
DO $$
DECLARE
  test_uid TEXT;
  test_uuid UUID;
BEGIN
  SELECT auth.uid()::TEXT INTO test_uid;
  RAISE NOTICE 'auth.uid() as text: %', test_uid;
  
  IF test_uid IS NOT NULL THEN
    test_uuid := test_uid::UUID;
    RAISE NOTICE 'Converted to UUID: %', test_uuid;
  ELSE
    RAISE NOTICE 'auth.uid() returned NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error converting auth.uid(): %', SQLERRM;
END $$;