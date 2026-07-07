import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Read-only Supabase client for MCP tools. Uses the publishable (anon) key
// so any query goes through RLS — tools can only see rows that public users
// are allowed to see.
export function mcpSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
