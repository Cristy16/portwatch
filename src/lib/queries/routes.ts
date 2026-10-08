// src/lib/queries/routes.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveRoute {
  id: string;
  name: string;
}

/** Active routes, alphabetical by name — used for route pickers and lists. */
export async function listActiveRoutes(supabase: SupabaseClient): Promise<ActiveRoute[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("id, name")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch routes: ${error.message}`);
  }

  return data ?? [];
}