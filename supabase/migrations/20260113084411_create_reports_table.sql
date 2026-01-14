/*
  # Create reports table for Roadfix Connect

  1. New Tables
    - `reports`
      - `id` (uuid, primary key) - Unique identifier for each report
      - `issue_type` (text) - Type of issue: Pothole, Waterlogging, or Signal
      - `image_url` (text) - URL to the uploaded image in Supabase storage
      - `latitude` (double precision) - Latitude coordinate of the issue location
      - `longitude` (double precision) - Longitude coordinate of the issue location
      - `status` (text) - Current status: Pending, In Progress, or Resolved
      - `created_at` (timestamptz) - Timestamp when report was created

  2. Security
    - Enable RLS on `reports` table
    - Add policy for anyone to read all reports (public access for viewing)
    - Add policy for anyone to insert new reports (public reporting)
    - Add policy for authenticated users to update report status (admin access)
    
  3. Notes
    - Public can view and create reports (user functionality)
    - Only authenticated users can update status (admin functionality)
    - Default status is 'Pending' for new reports
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL,
  image_url text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view all reports
CREATE POLICY "Anyone can view reports"
  ON reports
  FOR SELECT
  USING (true);

-- Allow anyone to insert new reports
CREATE POLICY "Anyone can create reports"
  ON reports
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can update report status
CREATE POLICY "Authenticated users can update reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);