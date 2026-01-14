/*
  # Add User ID to Reports Table

  1. Schema Changes
    - Add `user_id` (uuid) - Foreign key to auth.users
    - Add `description` (text) - Detailed description of the issue (was missing from original schema)
    
  2. Security Changes
    - Update RLS policies to allow users to view their own reports
    - Keep public view access for all reports (for map display)
  
  3. Important Notes
    - user_id will be NULL for existing reports (created before auth)
    - New reports will have user_id automatically set
    - Description field added to store detailed issue information
*/

-- Add user_id column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add description column if not exists
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description text;

-- Create index for faster user report queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- Update RLS policy to allow users to view their own reports
-- (Keep existing public view policy as well)
CREATE POLICY "Users can view their own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
