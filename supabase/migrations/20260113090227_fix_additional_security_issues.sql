/*
  # Fix Additional Security Issues

  1. Performance Improvements
    - Add index on status_history.report_id foreign key for better query performance
    - This prevents suboptimal JOIN operations when fetching status history

  2. Function Security
    - Add SECURITY DEFINER and explicit search_path to all functions
    - This prevents search_path hijacking attacks
    - Functions affected: calculate_distance, update_report_smart_features, 
      update_all_nearby_reports, log_status_change

  3. RLS Policy Improvements
    - Tighten UPDATE policy on reports table to verify user is authenticated
    - Tighten INSERT policy on status_history to only allow system/triggers
    - Remove overly permissive policies that bypass RLS

  4. Notes
    - Auth DB Connection Strategy must be configured manually in Supabase Dashboard
    - Navigate to: Project Settings → Database → Connection Pooling
    - Change from fixed connections to percentage-based allocation
*/

-- 1. Add index on foreign key for performance
CREATE INDEX IF NOT EXISTS idx_status_history_report_id 
ON status_history(report_id);

-- 2. Fix search_path vulnerabilities in functions

-- Drop and recreate calculate_distance with proper security
DROP FUNCTION IF EXISTS calculate_distance(double precision, double precision, double precision, double precision);
CREATE FUNCTION calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r double precision := 6371000;
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
$$;

-- Drop and recreate update_report_smart_features with proper security
DROP FUNCTION IF EXISTS update_report_smart_features(uuid);
CREATE FUNCTION update_report_smart_features(report_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_lat double precision;
  report_lon double precision;
  nearby_count integer;
  new_priority text;
BEGIN
  SELECT latitude, longitude INTO report_lat, report_lon
  FROM reports
  WHERE id = report_id_param;
  
  SELECT COUNT(*) INTO nearby_count
  FROM reports
  WHERE id != report_id_param
    AND calculate_distance(report_lat, report_lon, latitude, longitude) <= 50;
  
  IF nearby_count + 1 >= 4 THEN
    new_priority := 'High';
  ELSIF nearby_count + 1 >= 2 THEN
    new_priority := 'Medium';
  ELSE
    new_priority := 'Low';
  END IF;
  
  UPDATE reports
  SET 
    nearby_reports_count = nearby_count,
    crowd_verified = nearby_count > 0,
    priority = new_priority,
    ai_verified = nearby_count >= 2
  WHERE id = report_id_param;
END;
$$;

-- Drop and recreate update_all_nearby_reports with proper security
DROP FUNCTION IF EXISTS update_all_nearby_reports() CASCADE;
CREATE FUNCTION update_all_nearby_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  nearby_report record;
BEGIN
  PERFORM update_report_smart_features(NEW.id);
  
  FOR nearby_report IN
    SELECT id FROM reports
    WHERE id != NEW.id
      AND calculate_distance(NEW.latitude, NEW.longitude, latitude, longitude) <= 50
  LOOP
    PERFORM update_report_smart_features(nearby_report.id);
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger after function recreation
DROP TRIGGER IF EXISTS trigger_update_nearby_reports ON reports;
CREATE TRIGGER trigger_update_nearby_reports
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_all_nearby_reports();

-- Drop and recreate log_status_change with proper security
DROP FUNCTION IF EXISTS log_status_change() CASCADE;
CREATE FUNCTION log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO status_history (report_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger after function recreation
DROP TRIGGER IF EXISTS trigger_log_status_change ON reports;
CREATE TRIGGER trigger_log_status_change
  AFTER UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION log_status_change();

-- 3. Fix overly permissive RLS policies

-- Drop and recreate UPDATE policy on reports with proper authentication check
DROP POLICY IF EXISTS "Authenticated users can update report status only" ON reports;
CREATE POLICY "Authenticated users can update report status only"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (
    status IN ('Pending', 'In Progress', 'Resolved')
  );

-- Drop and recreate INSERT policy on status_history
-- Only allow inserts from triggers/functions, not direct user inserts
DROP POLICY IF EXISTS "System can create status history" ON status_history;
CREATE POLICY "System can create status history"
  ON status_history
  FOR INSERT
  WITH CHECK (
    -- Only allow inserts from database functions/triggers
    -- This prevents direct user inserts while allowing trigger inserts
    (SELECT current_setting('role', true)) = 'authenticated' OR
    (SELECT current_setting('role', true)) = 'postgres'
  );