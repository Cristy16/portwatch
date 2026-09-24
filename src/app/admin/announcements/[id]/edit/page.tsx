import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { utcToManilaDatetimeLocal, utcToManilaDateOnly } from '@/lib/manila-time';
import AnnouncementForm from '../../AnnouncementForm';

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: announcement }, { data: activeSources }, { data: routes }, { data: links }] =
    await Promise.all([
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
      supabase.from('routes').select('id, name').eq('active', true).order('name'),
      supabase.from('announcement_routes').select('route_id').eq('announcement_id', id),
    ]);

  if (!announcement) {
    notFound();
  }

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

  const formValues = {
    ...announcement,
    published_at: utcToManilaDatetimeLocal(announcement.published_at),
    effective_from: announcement.effective_from
      ? utcToManilaDatetimeLocal(announcement.effective_from)
      : null,
    effective_until: announcement.effective_until
      ? utcToManilaDateOnly(announcement.effective_until)
      : null,
    route_ids: (links ?? []).map((l) => l.route_id),
  };

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit announcement</h1>
      <AnnouncementForm
        announcement={formValues}
        sources={sources}
        routes={routes ?? []}
        defaultPublishedAt={formValues.published_at}
      />
    </div>
  );
}