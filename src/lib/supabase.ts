import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://yugkirleuiqreddxbzis.supabase.co";
const fallbackSupabasePublishableKey = "sb_publishable_5WlCiU6ND8vOOngtbyFynQ_ZFcQX7bI";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
