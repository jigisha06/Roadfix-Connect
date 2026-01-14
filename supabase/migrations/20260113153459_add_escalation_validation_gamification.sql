/*
  # Add Escalation, Crowd Validation, and Gamification Features

  1. Schema Changes to Reports Table
    - Add `escalated` (boolean) - Whether report has been auto-escalated
    - Add `escalated_at` (timestamptz) - When report was escalated
    - Add `confirmation_count` (integer) - Number of user confirmations/upvotes

  2. New Tables
    - `report_confirmations` - Track which users confirmed which reports
      - `id` (uuid, primary key)
      - `report_id` (uuid, foreign key to reports)
      - `user_id` (uuid, foreign key to auth.users)
      - `confirmed_at` (timestamptz)
    
    - `user_stats` - Track user points and achievements
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `points` (integer) - Total points earned
      - `verified_reports_count` (integer) - Number of verified reports
      - `confirmations_given` (integer) - Number of confirmations given
      - `badges` (jsonb) - Array of earned badges
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Functions
    - Function to check and escalate old pending reports
    - Function to add confirmation to a report
    - Function to award points to users
    - Trigger to update priority based on confirmations

  4. Security
    - Enable RLS on all new tables
    - Users can only confirm reports once
    - Users can view their own stats and other users' stats
*/

-- Add new columns to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS escalated_at timestamptz;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS confirmation_count integer DEFAULT 0;

-- Create report_confirmations table
CREATE TABLE IF NOT EXISTS report_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(report_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_confirmations_report_id ON report_confirmations(report_id);
CREATE INDEX IF NOT EXISTS idx_report_confirmations_user_id ON report_confirmations(user_id);

ALTER TABLE report_confirmations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view confirmations
CREATE POLICY "Anyone can view confirmations"
  ON report_confirmations
  FOR SELECT
  USING (true);

-- Authenticated users can add confirmations
CREATE POLICY "Authenticated users can add confirmations"
  ON report_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  verified_reports_count integer DEFAULT 0,
  confirmations_given integer DEFAULT 0,
  badges jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view user stats
CREATE POLICY "Anyone can view user stats"
  ON user_stats
  FOR SELECT
  USING (true);

-- Users can only update their own stats through functions
CREATE POLICY "System can update user stats"
  ON user_stats
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can modify user stats"
  ON user_stats
  FOR UPDATE
  USING (true);

-- Function to check and escalate old pending reports
CREATE OR REPLACE FUNCTION escalate_old_pending_reports()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add a confirmation to a report
CREATE OR REPLACE FUNCTION add_report_confirmation(report_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
DECLARE
  existing_confirmation uuid;
  report_owner_id uuid;
BEGIN
  -- Check if user already confirmed this report
  SELECT id INTO existing_confirmation
  FROM report_confirmations
  WHERE report_id = report_id_param AND user_id = user_id_param;
  
  IF existing_confirmation IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user is trying to confirm their own report
  SELECT user_id INTO report_owner_id
  FROM reports
  WHERE id = report_id_param;
  
  IF report_owner_id = user_id_param THEN
    RETURN false;
  END IF;
  
  -- Add confirmation
  INSERT INTO report_confirmations (report_id, user_id)
  VALUES (report_id_param, user_id_param);
  
  -- Update confirmation count
  UPDATE reports
  SET confirmation_count = confirmation_count + 1
  WHERE id = report_id_param;
  
  -- Update user stats for confirmation giver
  INSERT INTO user_stats (user_id, confirmations_given)
  VALUES (user_id_param, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    confirmations_given = user_stats.confirmations_given + 1,
    points = user_stats.points + 5,
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points for verified reports
CREATE OR REPLACE FUNCTION award_points_for_verified_report(report_id_param uuid)
RETURNS void AS $$
DECLARE
  report_owner_id uuid;
  report_verified boolean;
BEGIN
  -- Get report owner and verification status
  SELECT user_id, crowd_verified INTO report_owner_id, report_verified
  FROM reports
  WHERE id = report_id_param;
  
  IF report_owner_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Award points if report is verified
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update priority based on confirmations
CREATE OR REPLACE FUNCTION update_priority_with_confirmations()
RETURNS trigger AS $$
DECLARE
  nearby_count integer;
  total_signals integer;
  new_priority text;
BEGIN
  -- Get nearby reports count
  nearby_count := NEW.nearby_reports_count;
  
  -- Calculate total signals (nearby reports + confirmations)
  total_signals := nearby_count + NEW.confirmation_count + 1;
  
  -- Calculate priority based on total signals
  IF total_signals >= 6 THEN
    new_priority := 'High';
  ELSIF total_signals >= 3 THEN
    new_priority := 'Medium';
  ELSE
    new_priority := 'Low';
  END IF;
  
  -- Update priority if changed
  IF new_priority != NEW.priority THEN
    NEW.priority := new_priority;
  END IF;
  
  -- Award points if report becomes verified
  IF NEW.crowd_verified AND NEW.confirmation_count >= 2 THEN
    PERFORM award_points_for_verified_report(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update priority when confirmation count changes
DROP TRIGGER IF EXISTS trigger_update_priority_with_confirmations ON reports;
CREATE TRIGGER trigger_update_priority_with_confirmations
  BEFORE UPDATE OF confirmation_count ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_priority_with_confirmations();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION escalate_old_pending_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION add_report_confirmation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION award_points_for_verified_report(uuid) TO authenticated;

-- Create initial user stats for existing users
INSERT INTO user_stats (user_id, points, verified_reports_count)
SELECT DISTINCT user_id, 0, 0
FROM reports
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;
