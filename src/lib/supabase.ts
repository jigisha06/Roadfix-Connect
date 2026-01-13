import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Report {
  id: string;
  issue_type: string;
  description: string;
  image_url: string;
  latitude: number;
  longitude: number;
  status: 'Pending' | 'In Progress' | 'Resolved';
  created_at: string;
  crowd_verified: boolean;
  nearby_reports_count: number;
  priority: 'Low' | 'Medium' | 'High';
  ai_verified: boolean;
  user_id: string | null;
  escalated: boolean;
  escalated_at: string | null;
  confirmation_count: number;
}

export interface StatusHistory {
  id: string;
  report_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
}

export interface UserStats {
  user_id: string;
  points: number;
  verified_reports_count: number;
  confirmations_given: number;
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface ReportConfirmation {
  id: string;
  report_id: string;
  user_id: string;
  confirmed_at: string;
}
