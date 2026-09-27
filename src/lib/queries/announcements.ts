// src/lib/queries/announcements.ts
//
// Two families of query live here:
//  1. getStatusAnnouncementsForRoute — maps to the StatusAnnouncement shape
//     status.ts expects (ACTIVE only, source active/official flags, all
//     route links for the matched rows). Used for status computation.
//  2. listPublicAnnouncements / getAnnouncementById — maps to the richer
//     PublicAnnouncement shape the public list/detail pages display
//     (adds description, source name/url, and is filterable/searchable).
//
// Both take a Supabase client as a parameter rather than constructing one
// themselves, so they work with the cookie-aware server client in the app
// AND with a plain test client in Vitest.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StatusAnnouncement, StatusAnnouncementType } from '@/lib/status';

// ---------------------------------------------------------------------------
// 1. Status-computation mapper
// ---------------------------------------------------------------------------

export async function getStatusAnnouncementsForRoute(
  supabase: SupabaseClient,
  routeId: string
): Promise<StatusAnnouncement[]> {
  const { data: routeLinks, error: routeLinksError } = await supabase
    .from('announcement_routes')
    .select('announcement_id')
    .eq('route_id', routeId);

  if (routeLinksError) {
    throw new Error(`Failed to fetch route links: ${routeLinksError.message}`);
  }

  const routeAnnouncementIds = (routeLinks ?? []).map((r) => r.announcement_id);

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
    .filter((a) => a.sourceIsActive);
}

// ---------------------------------------------------------------------------
// 2. Public display shape — list + detail
// ---------------------------------------------------------------------------

export interface PublicAnnouncement {
  id: string;
  title: string;
  description: string | null;
  type: StatusAnnouncementType;
  publishedAt: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  sourceName: string;
  sourceUrl: string;
  sourceIsOfficial: boolean;
  appliesToAllRoutes: boolean;
  routeIds: string[];
}

export interface AnnouncementListFilters {
  type?: StatusAnnouncementType;
  routeId?: string;
  /** Case-insensitive search against title and description. */
  q?: string;
}

const PUBLIC_ANNOUNCEMENT_SELECT = `
  id, title, description, type, published_at, effective_from, effective_until,
  applies_to_all_routes,
  source:sources!inner(name, url, official)
`;

type PublicAnnouncementRow = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  published_at: string;
  effective_from: string | null;
  effective_until: string | null;
  applies_to_all_routes: boolean;
  source: { name: string; url: string; official: boolean } | { name: string; url: string; official: boolean }[];
};

function escapeOrValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function mapPublicAnnouncementRow(row: PublicAnnouncementRow, routeIds: string[]): PublicAnnouncement | null {
  const source = Array.isArray(row.source) ? row.source[0] : row.source;
  if (!source) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as StatusAnnouncementType,
    publishedAt: row.published_at,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    sourceName: source.name,
    sourceUrl: source.url,
    sourceIsOfficial: source.official,
    appliesToAllRoutes: row.applies_to_all_routes,
    routeIds,
  };
}

async function fetchRouteLinksFor(
  supabase: SupabaseClient,
  announcementIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (announcementIds.length === 0) return map;

  const { data: links, error } = await supabase
    .from('announcement_routes')
    .select('announcement_id, route_id')
    .in('announcement_id', announcementIds);

  if (error) {
    throw new Error(`Failed to fetch announcement routes: ${error.message}`);
  }

  for (const link of links ?? []) {
    const list = map.get(link.announcement_id) ?? [];
    list.push(link.route_id);
    map.set(link.announcement_id, list);
  }
  return map;
}

export async function listPublicAnnouncements(
  supabase: SupabaseClient,
  filters: AnnouncementListFilters = {}
): Promise<PublicAnnouncement[]> {
  let routeAnnouncementIds: string[] | null = null;

  if (filters.routeId) {
    const { data: routeLinks, error: routeLinksError } = await supabase
      .from('announcement_routes')
      .select('announcement_id')
      .eq('route_id', filters.routeId);

    if (routeLinksError) {
      throw new Error(`Failed to fetch route links: ${routeLinksError.message}`);
    }
    routeAnnouncementIds = (routeLinks ?? []).map((r) => r.announcement_id);
  }

  let query = supabase
    .from('announcements')
    .select(PUBLIC_ANNOUNCEMENT_SELECT)
    .eq('status', 'ACTIVE')
    .order('published_at', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.routeId) {
    query =
      routeAnnouncementIds && routeAnnouncementIds.length > 0
        ? query.or(`applies_to_all_routes.eq.true,id.in.(${routeAnnouncementIds.join(',')})`)
        : query.eq('applies_to_all_routes', true);
  }

  if (filters.q) {
    const escaped = escapeOrValue(`%${filters.q}%`);
    query = query.or(`title.ilike.${escaped},description.ilike.${escaped}`);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch announcements: ${error.message}`);
  }
  if (!rows || rows.length === 0) {
    return [];
  }

  const routeIdsByAnnouncement = await fetchRouteLinksFor(
    supabase,
    rows.map((r) => r.id)
  );

  return rows
    .map((row) => mapPublicAnnouncementRow(row as PublicAnnouncementRow, routeIdsByAnnouncement.get(row.id) ?? []))
    .filter((a): a is PublicAnnouncement => a !== null);
}

export async function getAnnouncementById(
  supabase: SupabaseClient,
  id: string
): Promise<PublicAnnouncement | null> {
  const { data: row, error } = await supabase
    .from('announcements')
    .select(PUBLIC_ANNOUNCEMENT_SELECT)
    .eq('id', id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch announcement: ${error.message}`);
  }
  if (!row) {
    return null;
  }

  const { data: links, error: linksError } = await supabase
    .from('announcement_routes')
    .select('route_id')
    .eq('announcement_id', id);

  if (linksError) {
    throw new Error(`Failed to fetch announcement routes: ${linksError.message}`);
  }

  const routeIds = (links ?? []).map((l) => l.route_id);

  return mapPublicAnnouncementRow(row as PublicAnnouncementRow, routeIds);
}