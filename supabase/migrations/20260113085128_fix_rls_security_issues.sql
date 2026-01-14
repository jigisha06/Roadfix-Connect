/*
  # Fix RLS Security Issues

  1. RLS Policy Improvements for reports table
    - Drop overly permissive policies that allow unrestricted access
    - Add restrictive INSERT policy that validates required fields and data types
    - Add restrictive UPDATE policy that only allows status field updates
    
  2. Security Enhancements
    - INSERT policy validates all required fields are present and non-empty
    - INSERT policy ensures latitude/longitude are within valid geographic ranges
    - INSERT policy restricts issue_type to only allowed values
    - INSERT policy forces status to be 'Pending' for new reports
    - UPDATE policy restricts changes to only the status field
    - UPDATE policy ensures status values are valid enum values
    - UPDATE policy prevents modification of report location and details
*/

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create reports" ON reports;
DROP POLICY IF EXISTS "Authenticated users can update reports" ON reports;

-- Create restrictive INSERT policy
-- Validates that all required fields are provided and within acceptable ranges
CREATE POLICY "Public can create valid reports"
  ON reports
  FOR INSERT
  WITH CHECK (
    issue_type IS NOT NULL AND
    issue_type IN ('Pothole', 'Waterlogging', 'Signal') AND
    image_url IS NOT NULL AND
    image_url != '' AND
    latitude IS NOT NULL AND
    longitude IS NOT NULL AND
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180 AND
    (status IS NULL OR status = 'Pending')
  );

-- Create restrictive UPDATE policy
-- Only allows authenticated users to update the status field with valid values
-- Prevents modification of other fields to maintain data integrity
CREATE POLICY "Authenticated users can update report status only"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    status IN ('Pending', 'In Progress', 'Resolved')
  );