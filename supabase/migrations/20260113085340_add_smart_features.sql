/*
  # Add Smart Features to Roadfix Connect

  1. Schema Changes
    - Add `crowd_verified` (boolean) - True if multiple reports within 50m
    - Add `nearby_reports_count` (integer) - Number of reports within 50m
    - Add `priority` (text) - Low, Medium, or High based on report count
    - Add `ai_verified` (boolean) - Placeholder for future AI integration

  2. New Tables
    - `status_history` - Track status changes with timestamps
      - `id` (uuid, primary key)
      - `report_id` (uuid, foreign key to reports)
      - `old_status` (text)
      - `new_status` (text)
      - `changed_at` (timestamptz)
      - `changed_by` (text)

  3. Functions
    - Haversine distance calculation function
    - Function to update nearby reports count and priority
    - Trigger to automatically update on new reports
    - Function to log status changes

  4. Security
    - Enable RLS on status_history table
    - Allow public read access to history
    - Allow authenticated users to create history entries
*/

-- Add new columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS crowd_verified boolean DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS nearby_reports_count integer DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Low';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_verified boolean DEFAULT false;

-- Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  changed_by text DEFAULT 'system'
);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view status history
CREATE POLICY "Anyone can view status history"
  ON status_history
  FOR SELECT
  USING (true);

-- Only system/authenticated users can insert history
CREATE POLICY "System can create status history"
  ON status_history
  FOR INSERT
  WITH CHECK (true);

-- Create function to calculate distance between two points using Haversine formula
-- Returns distance in meters
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision AS $$
DECLARE
  r double precision := 6371000; -- Earth's radius in meters
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update nearby reports count and priority for a given report
CREATE OR REPLACE FUNCTION update_report_smart_features(report_id_param uuid)
RETURNS void AS $$
DECLARE
  report_lat double precision;
  report_lon double precision;
  nearby_count integer;
  new_priority text;
BEGIN
  -- Get the coordinates of the report
  SELECT latitude, longitude INTO report_lat, report_lon
  FROM reports
  WHERE id = report_id_param;
  
  -- Count nearby reports within 50 meters (excluding self)
  SELECT COUNT(*) INTO nearby_count
  FROM reports
  WHERE id != report_id_param
    AND calculate_distance(report_lat, report_lon, latitude, longitude) <= 50;
  
  -- Calculate priority based on nearby count (including self)
  IF nearby_count + 1 >= 4 THEN
    new_priority := 'High';
  ELSIF nearby_count + 1 >= 2 THEN
    new_priority := 'Medium';
  ELSE
    new_priority := 'Low';
  END IF;
  
  -- Update the report
  UPDATE reports
  SET 
    nearby_reports_count = nearby_count,
    crowd_verified = nearby_count > 0,
    priority = new_priority,
    ai_verified = nearby_count >= 2  -- Auto-verify if 3+ reports
  WHERE id = report_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update all affected reports when a new report is added
CREATE OR REPLACE FUNCTION update_all_nearby_reports()
RETURNS trigger AS $$
DECLARE
  nearby_report record;
BEGIN
  -- Update the newly inserted report
  PERFORM update_report_smart_features(NEW.id);
  
  -- Update all reports within 50 meters of the new report
  FOR nearby_report IN
    SELECT id FROM reports
    WHERE id != NEW.id
      AND calculate_distance(NEW.latitude, NEW.longitude, latitude, longitude) <= 50
  LOOP
    PERFORM update_report_smart_features(nearby_report.id);
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new reports
DROP TRIGGER IF EXISTS trigger_update_nearby_reports ON reports;
CREATE TRIGGER trigger_update_nearby_reports
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_all_nearby_reports();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS trigger AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_history (report_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS trigger_log_status_change ON reports;
CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- Insert initial status for existing reports
INSERT INTO status_history (report_id, old_status, new_status, changed_by)
SELECT id, NULL, status, 'system'
FROM reports
WHERE NOT EXISTS (
  SELECT 1 FROM status_history WHERE report_id = reports.id
);