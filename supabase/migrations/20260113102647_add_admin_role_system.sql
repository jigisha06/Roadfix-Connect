/*
  # Add Admin Role System

  1. Changes
    - Create helper function to check if user is admin
    - Create function to set admin status (only callable by existing admins or service role)
    - Update RLS policies on reports table to restrict updates to admins only
  
  2. Security
    - Admin status stored in auth.users app_metadata (cannot be modified by users)
    - Only service role or existing admins can promote users to admin
    - Admin check function uses JWT metadata for secure verification
  
  3. Important Notes
    - To create the first admin, use Supabase dashboard or run this SQL:
      UPDATE auth.users 
      SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb 
      WHERE email = 'your-admin@email.com';
    - Admin status is checked via auth.jwt() in RLS policies
*/

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (auth.jwt()->>'app_metadata')::jsonb->>'is_admin')::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote a user to admin (only admins can do this)
CREATE OR REPLACE FUNCTION set_user_admin(user_id uuid, is_admin boolean)
RETURNS void AS $$
BEGIN
  -- Only allow if caller is already an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can modify admin status';
  END IF;
  
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('is_admin', is_admin)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reports table policies to restrict updates to admins only
DROP POLICY IF EXISTS "Authenticated users can update reports" ON reports;

CREATE POLICY "Only admins can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_admin(uuid, boolean) TO authenticated;
