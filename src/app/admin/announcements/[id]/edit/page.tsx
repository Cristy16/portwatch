// src/app/admin/announcements/[id]/edit/page.tsx
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { utcToManilaDatetimeLocal, utcToManilaDateOnly } from '@/lib/manila-time';
import AnnouncementForm from '../../AnnouncementForm';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: announcement },
    { data: activeSources },
    { data: activeRoutes },
    { data: links },
  ] = await Promise.all([
    supabase
      .from('announcements')
      .select(
        'id, title, description, type, impact, source_id, source_url, published_at, effective_from, effective_until, applies_to_all_routes, status'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('sources')
      .select('id, name, official, active')
      .eq('active', true)
      .order('name'),
    supabase.from('routes').select('id, name, active').eq('active', true).order('name'),
    supabase.from('announcement_routes').select('route_id').eq('announcement_id', id),
  ]);

  if (!announcement) {
    notFound();
  }

  const linkedRouteIds = (links ?? []).map((l) => l.route_id);

  // Force-include the announcement's current source even if it's since gone
  // inactive, so the dropdown never silently defaults to a different one.
  let sources = activeSources ?? [];
  if (!sources.some((s) => s.id === announcement.source_id)) {
    const { data: currentSource } = await supabase
      .from('sources')
      .select('id, name, official, active')
      .eq('id', announcement.source_id)
      .single();
    if (currentSource) {
      sources = [...sources, currentSource];
    }
  }

  // Force-include any currently-linked routes even if they've since gone
  // inactive, so a saved announcement never silently loses a route link
  // just because the route was deactivated after the fact.
  let routes = activeRoutes ?? [];
  const missingLinkedRouteIds = linkedRouteIds.filter(
    (routeId) => !routes.some((r) => r.id === routeId)
  );
  if (missingLinkedRouteIds.length > 0) {
    const { data: inactiveLinkedRoutes } = await supabase
      .from('routes')
      .select('id, name, active')
      .in('id', missingLinkedRouteIds);
    if (inactiveLinkedRoutes) {
      routes = [...routes, ...inactiveLinkedRoutes];
    }
  }

  const formValues = {
    ...announcement,
    published_at: utcToManilaDatetimeLocal(announcement.published_at),
    effective_from: announcement.effective_from
      ? utcToManilaDatetimeLocal(announcement.effective_from)
      : null,
    effective_until: announcement.effective_until
      ? utcToManilaDateOnly(announcement.effective_until)
      : null,
    route_ids: linkedRouteIds,
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit announcement</h1>
      <AnnouncementForm
        announcement={formValues}
        sources={sources}
        routes={routes}
        defaultPublishedAt={formValues.published_at}
      />
    </div>
  );
}