/*
  # Add City and Address Fields to Reports

  ## Description
  Add city and full address fields to the reports table to store location details
  from reverse geocoding.

  ## Changes
  1. New Columns
    - `city` (text) - City name detected from reverse geocoding
    - `address` (text) - Full address detected from reverse geocoding
    - `landmark` (text, optional) - User-provided landmark for better location context

  ## Notes
  - These fields enhance location data with human-readable information
  - City and address are auto-detected via reverse geocoding
  - Landmark is an optional field that users can fill in manually
  - All fields are nullable to maintain backward compatibility with existing reports
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'city'
  ) THEN
    ALTER TABLE reports ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'address'
  ) THEN
    ALTER TABLE reports ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'landmark'
  ) THEN
    ALTER TABLE reports ADD COLUMN landmark text;
  END IF;
END $$;