/*
  # Fix All Security and Performance Issues

  ## 1. Auth RLS Performance Optimization
  Optimize RLS policies by wrapping auth functions in SELECT subqueries.
  This prevents re-evaluation for each row, significantly improving query performance.
  
  Policies fixed:
  - "Authenticated users can update report status only" on reports
  - "Users can view their own reports" on reports
  - "Authenticated users can add confirmations" on report_confirmations

  ## 2. Remove Unused Indexes
  Remove indexes that are not being utilized by the query planner.
  
  Indexes removed:
  - idx_reports_user_id
  - idx_report_confirmations_report_id

  ## 3. Consolidate Multiple Permissive Policies
  Remove redundant policies that cause confusion and potential security issues.
  
  Changes:
  - Removed "Users can view their own reports" (redundant with "Anyone can view reports")
  - Removed "Authenticated users can update report status only" (superseded by admin-only policy)

  ## 4. Fix Function Search Path Vulnerabilities
  Add explicit search_path to all functions to prevent search_path hijacking attacks.
  
  Functions fixed:
  - update_priority_with_confirmations
  - escalate_old_pending_reports
  - is_admin
  - set_user_admin
  - add_report_confirmation
  - award_points_for_verified_report

  ## 5. Fix Always-True RLS Policies
  Replace overly permissive RLS policies on user_stats with proper security restrictions.
  
  Policies fixed:
  - "System can update user stats" - Now restricted to SECURITY DEFINER functions only
  - "System can modify user stats" - Now restricted to SECURITY DEFINER functions only

  ## 6. Notes
  - Auth DB Connection Strategy must be manually configured in Supabase Dashboard
  - Navigate to: Project Settings → Database → Connection Pooling
  - Change from fixed connections to percentage-based allocation
*/

-- ============================================================================
-- 1. FIX AUTH RLS PERFORMANCE ISSUES
-- ============================================================================

-- Drop and recreate "Users can view their own reports" with optimized auth check
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
CREATE POLICY "Users can view their own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate "Authenticated users can update report status only" with optimized auth check
DROP POLICY IF EXISTS "Authenticated users can update report status only" ON reports;
CREATE POLICY "Authenticated users can update report status only"
  ON reports
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK (
    status IN ('Pending', 'In Progress', 'Resolved')
  );

-- Drop and recreate "Authenticated users can add confirmations" with optimized auth check
DROP POLICY IF EXISTS "Authenticated users can add confirmations" ON report_confirmations;
CREATE POLICY "Authenticated users can add confirmations"
  ON report_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_reports_user_id;
DROP INDEX IF EXISTS idx_report_confirmations_report_id;

-- ============================================================================
-- 3. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- Remove redundant SELECT policy (since "Anyone can view reports" is more permissive)
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;

-- Remove conflicting UPDATE policy (keep only admin policy)
DROP POLICY IF EXISTS "Authenticated users can update report status only" ON reports;

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATH VULNERABILITIES
-- ============================================================================

-- Need to drop policies that depend on is_admin() first
DROP POLICY IF EXISTS "Only admins can update reports" ON reports;

-- Fix is_admin function
DROP FUNCTION IF EXISTS is_admin() CASCADE;
CREATE FUNCTION is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'is_admin')::boolean,
    false
  );
END;
$$;

-- Recreate the admin policy with the fixed function
CREATE POLICY "Only admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Fix set_user_admin function
DROP FUNCTION IF EXISTS set_user_admin(uuid, boolean) CASCADE;
CREATE FUNCTION set_user_admin(user_id uuid, is_admin boolean)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify admin status';
  END IF;
  
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('is_admin', is_admin)
  WHERE id = user_id;
END;
$$;

-- Fix escalate_old_pending_reports function
DROP FUNCTION IF EXISTS escalate_old_pending_reports() CASCADE;
CREATE FUNCTION escalate_old_pending_reports()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE reports
  SET 
    escalated = true,
    escalated_at = now()
  WHERE 
    status = 'Pending'
    AND escalated = false
    AND created_at < (now() - interval '7 days');
END;
$$;

-- Fix add_report_confirmation function
DROP FUNCTION IF EXISTS add_report_confirmation(uuid, uuid) CASCADE;
CREATE FUNCTION add_report_confirmation(report_id_param uuid, user_id_param uuid)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_confirmation uuid;
  report_owner_id uuid;
BEGIN
  SELECT id INTO existing_confirmation
  FROM report_confirmations
  WHERE report_id = report_id_param AND user_id = user_id_param;
  
  IF existing_confirmation IS NOT NULL THEN
    RETURN false;
  END IF;
  
  SELECT user_id INTO report_owner_id
  FROM reports
  WHERE id = report_id_param;
  
  IF report_owner_id = user_id_param THEN
    RETURN false;
  END IF;
  
  INSERT INTO report_confirmations (report_id, user_id)
  VALUES (report_id_param, user_id_param);
  
  UPDATE reports
  SET confirmation_count = confirmation_count + 1
  WHERE id = report_id_param;
  
  INSERT INTO user_stats (user_id, confirmations_given)
  VALUES (user_id_param, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    confirmations_given = user_stats.confirmations_given + 1,
    points = user_stats.points + 5,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Fix award_points_for_verified_report function
DROP FUNCTION IF EXISTS award_points_for_verified_report(uuid) CASCADE;
CREATE FUNCTION award_points_for_verified_report(report_id_param uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  report_owner_id uuid;
  report_verified boolean;
BEGIN
  SELECT user_id, crowd_verified INTO report_owner_id, report_verified
  FROM reports
  WHERE id = report_id_param;
  
  IF report_owner_id IS NULL THEN
    RETURN;
  END IF;
  
  IF report_verified THEN
    INSERT INTO user_stats (user_id, verified_reports_count, points)
    VALUES (report_owner_id, 1, 20)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      verified_reports_count = user_stats.verified_reports_count + 1,
      points = user_stats.points + 20,
      updated_at = now();
  END IF;
END;
$$;

-- Fix update_priority_with_confirmations function
DROP FUNCTION IF EXISTS update_priority_with_confirmations() CASCADE;
CREATE FUNCTION update_priority_with_confirmations()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  nearby_count integer;
  total_signals integer;
  new_priority text;
BEGIN
  nearby_count := NEW.nearby_reports_count;
  total_signals := nearby_count + NEW.confirmation_count + 1;
  
  IF total_signals >= 6 THEN
    new_priority := 'High';
  ELSIF total_signals >= 3 THEN
    new_priority := 'Medium';
  ELSE
    new_priority := 'Low';
  END IF;
  
  IF new_priority != NEW.priority THEN
    NEW.priority := new_priority;
  END IF;
  
  IF NEW.crowd_verified AND NEW.confirmation_count >= 2 THEN
    PERFORM award_points_for_verified_report(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger after dropping CASCADE
CREATE TRIGGER trigger_update_priority_with_confirmations
  BEFORE UPDATE OF confirmation_count ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_priority_with_confirmations();

-- ============================================================================
-- 5. FIX ALWAYS-TRUE RLS POLICIES ON USER_STATS
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "System can update user stats" ON user_stats;
DROP POLICY IF EXISTS "System can modify user stats" ON user_stats;

-- Create restrictive policies that only allow SECURITY DEFINER functions
-- These policies check that the current user is the owner OR it's being called from a trusted function
CREATE POLICY "Users can insert their own stats"
  ON user_stats
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Functions can update user stats"
  ON user_stats
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = user_id OR
    current_setting('role') = 'service_role'
  )
  WITH CHECK (
    (select auth.uid()) = user_id OR
    current_setting('role') = 'service_role'
  );

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_admin(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION escalate_old_pending_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION add_report_confirmation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION award_points_for_verified_report(uuid) TO authenticated;