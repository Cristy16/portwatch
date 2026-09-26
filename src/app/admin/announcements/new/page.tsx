// src/app/admin/announcements/new/page.tsx
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { nowManilaDatetimeLocal } from '@/lib/manila-time';
import AnnouncementForm from '../AnnouncementForm';

export default async function NewAnnouncementPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [{ data: sources }, { data: routes }] = await Promise.all([
    supabase
      .from('sources')
      .select('id, name, official, active')
      .eq('active', true)
      .order('name'),
    supabase.from('routes').select('id, name').eq('active', true).order('name'),
  ]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">New announcement</h1>
      <AnnouncementForm
        sources={sources ?? []}
        routes={routes ?? []}
        defaultPublishedAt={nowManilaDatetimeLocal()}
      />
    </div>
  );
}