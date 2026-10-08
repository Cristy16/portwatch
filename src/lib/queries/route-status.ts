// src/lib/queries/route-status.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTripStatus } from "@/lib/status";
import type { StatusTrip, TripStatusResult, TripStatus } from "@/lib/status";
import { getStatusAnnouncementsForRoute } from "@/lib/queries/announcements";
import { utcToManilaDateOnly } from "@/lib/manila-time";

export async function getCurrentRouteStatus(
  supabase: SupabaseClient,
  routeId: string,
  now: Date = new Date()
): Promise<TripStatusResult> {
  const announcements = await getStatusAnnouncementsForRoute(supabase, routeId);

  const syntheticTrip: StatusTrip = {
    routeId,
    travelDate: utcToManilaDateOnly(now.toISOString()),
  };

  return getTripStatus(syntheticTrip, announcements, now);
}

// ---------------------------------------------------------------------------
// Site-wide summary for the home dashboard
// ---------------------------------------------------------------------------

const SEVERITY: Record<TripStatus, number> = {
  DISRUPTED: 3,
  MONITOR: 2,
  UNKNOWN: 1,
  NORMAL: 0,
};

export interface RouteStatusEntry {
  routeId: string;
  result: TripStatusResult;
}

export interface OverallStatusResult {
  status: TripStatus;
  routeStatuses: RouteStatusEntry[];
  computedAt: string;
}

export async function getOverallStatus(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<OverallStatusResult> {
  const { data: routes, error } = await supabase
    .from("routes")
    .select("id")
    .eq("active", true);

  if (error) {
    throw new Error(`Failed to fetch routes: ${error.message}`);
  }

  const computedAt = now.toISOString();

  if (!routes || routes.length === 0) {
    return { status: "UNKNOWN", routeStatuses: [], computedAt };
  }

  const routeStatuses: RouteStatusEntry[] = await Promise.all(
    routes.map(async (route) => ({
      routeId: route.id as string,
      result: await getCurrentRouteStatus(supabase, route.id as string, now),
    }))
  );

  const status = routeStatuses.reduce<TripStatus>(
    (worst, entry) => (SEVERITY[entry.result.status] > SEVERITY[worst] ? entry.result.status : worst),
    "NORMAL"
  );

  return { status, routeStatuses, computedAt };
}