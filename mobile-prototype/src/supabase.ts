import { createClient } from "@supabase/supabase-js";
import { isNativeAndroid } from "./mobile/native";

// Publishable keys identify the project. Authorization always comes from RLS.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://hsentdihwpkmgvavzyiq.supabase.co";
export const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_y9niOuYRzKOtDHmBgQd8SA_udSLbUsW";
export const authRedirectUrl = isNativeAndroid ? "com.sattimgitti.app://auth/callback" : window.location.origin;
export const supabase = createClient(supabaseUrl, supabaseKey, isNativeAndroid ? { auth: { flowType: "pkce", detectSessionInUrl: false } } : undefined);
