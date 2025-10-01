-- Fix chat_notifications schema compatibility
-- Add missing read_at column if it doesn't exist

-- Check and add read_at column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_notifications' 
        AND column_name = 'read_at'
    ) THEN
        -- Add the missing read_at column
        ALTER TABLE chat_notifications 
        ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added read_at column to chat_notifications table';
    ELSE
        RAISE NOTICE 'read_at column already exists in chat_notifications table';
    END IF;
END $$;

-- Update any existing read notifications to have a read_at timestamp
UPDATE chat_notifications 
SET read_at = created_at 
WHERE is_read = true AND read_at IS NULL;

COMMENT ON COLUMN chat_notifications.read_at IS 'Timestamp when the notification was marked as read';