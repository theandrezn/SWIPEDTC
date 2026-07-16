import { createBrowserClient } from "@supabase/ssr";

const fallbackSupabaseUrl = "https://yugkirleuiqreddxbzis.supabase.co";
const fallbackSupabasePublishableKey = "sb_publishable_5WlCiU6ND8vOOngtbyFynQ_ZFcQX7bI";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const configuredSupabaseUrl = supabaseUrl;

export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      cookieOptions: {
        name: "dtc-swipe-hub-session",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    })
  : null;
