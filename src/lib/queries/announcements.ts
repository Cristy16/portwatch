// src/lib/queries/announcements.ts
//
// Maps announcements + their route links + their source into the exact
// StatusAnnouncement shape status.ts expects. Reusable in Phase 6.
//
// Takes a Supabase client as a parameter rather than constructing one itself,
// so it works with the cookie-aware server client in the app AND with a plain
// test client in Vitest (which has no request context for cookies()).

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StatusAnnouncement } from '@/lib/status';

export async function getStatusAnnouncementsForRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<StatusAnnouncement[]> {
  // Which announcement IDs are explicitly linked to this route?
  const { data: routeLinks, error: routeLinksError } = await supabase
    .from('announcement_routes')
    .select('announcement_id')
    .eq('route_id', routeId);

  if (routeLinksError) {
    throw new Error(`Failed to fetch route links: ${routeLinksError.message}`);
  }

  const routeAnnouncementIds = (routeLinks ?? []).map((r) => r.announcement_id);

  // Fetch ACTIVE announcements that either apply to all routes, or are
  // explicitly linked to this route, along with their source.
  let query = supabase
    .from('announcements')
    .select(
      `id, title, type, status, impact, published_at, effective_from, effective_until,
       applies_to_all_routes,
       source:sources!inner(official, active)`
    )
    .eq('status', 'ACTIVE');

  query =
    routeAnnouncementIds.length > 0
      ? query.or(`applies_to_all_routes.eq.true,id.in.(${routeAnnouncementIds.join(',')})`)
      : query.eq('applies_to_all_routes', true);

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }
  if (!rows || rows.length === 0) {
    return [];
  }

  // Fetch every route link for the matched announcements, so route-specific
  // announcements carry their FULL route list (not just this one route) —
  // keeps the mapper correct when reused for other routes later.
  const matchedIds = rows.map((r) => r.id);
  const { data: allLinks, error: allLinksError } = await supabase
    .from('announcement_routes')
    .select('announcement_id, route_id')
    .in('announcement_id', matchedIds);

  if (allLinksError) {
    throw new Error(`Failed to fetch announcement routes: ${allLinksError.message}`);
  }

  const routeIdsByAnnouncement = new Map<string, string[]>();
  for (const link of allLinks ?? []) {
    const list = routeIdsByAnnouncement.get(link.announcement_id) ?? [];
    list.push(link.route_id);
    routeIdsByAnnouncement.set(link.announcement_id, list);
  }

  return rows
    .map((row): StatusAnnouncement | null => {
      const source = Array.isArray(row.source) ? row.source[0] : row.source;
      if (!source) return null;

      return {
        id: row.id,
        title: row.title,
        type: row.type as StatusAnnouncement['type'],
        status: row.status as StatusAnnouncement['status'],
        impact: row.impact as StatusAnnouncement['impact'],
        publishedAt: row.published_at,
        effectiveFrom: row.effective_from,
        effectiveUntil: row.effective_until,
        routeIds: routeIdsByAnnouncement.get(row.id) ?? [],
        appliesToAllRoutes: row.applies_to_all_routes,
        sourceIsOfficial: source.official,
        sourceIsActive: source.active,
      };
    })
    .filter((a): a is StatusAnnouncement => a !== null)
    .filter((a) => a.sourceIsActive); // drop inactive sources here, per the mapper's own contract
}