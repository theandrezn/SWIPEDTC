import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://rbsrgfaqmpoidudpsqyd.supabase.co";
const fallbackSupabasePublishableKey = "sb_publishable_FQC55-0wdb5gVGWK4yu5eg_rK-gSvYU";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
