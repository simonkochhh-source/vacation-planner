-- Database Synchronization Script
-- Generated: 2025-09-24T09:21:04.426Z
-- This script will make Dev database identical to Production

BEGIN;

-- Add missing columns to users
-- ALTER TABLE users ADD COLUMN id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN email TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN nickname TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN display_name TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN avatar_url TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN language TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN timezone TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN is_profile_public TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN allow_friend_requests TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN allow_trip_invitations TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN is_active TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN is_verified TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN last_seen_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN created_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE users ADD COLUMN updated_at TYPE_UNKNOWN; -- Manual review needed

-- Add missing columns to user_profiles
-- ALTER TABLE user_profiles ADD COLUMN id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN nickname TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN display_name TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN bio TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN avatar_url TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN email TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN location TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN website TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN social_links TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN is_public_profile TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN follower_count TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN following_count TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN trip_count TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN created_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN updated_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_profiles ADD COLUMN is_verified TYPE_UNKNOWN; -- Manual review needed

-- Add missing columns to trips
-- ALTER TABLE trips ADD COLUMN id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN name TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN description TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN start_date TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN end_date TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN budget TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN participants TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN status TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN created_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN updated_at TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN user_id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN privacy TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN owner_id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN tagged_users TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE trips ADD COLUMN tags TYPE_UNKNOWN; -- Manual review needed

-- Add missing columns to user_activities
-- ALTER TABLE user_activities ADD COLUMN id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN user_id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN activity_type TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN related_trip_id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN related_destination_id TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN metadata TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN title TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN description TYPE_UNKNOWN; -- Manual review needed
-- ALTER TABLE user_activities ADD COLUMN created_at TYPE_UNKNOWN; -- Manual review needed

-- Review and execute this script carefully
-- Some changes may require manual intervention

COMMIT;
