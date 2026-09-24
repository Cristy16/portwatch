import { createClient } from '@/lib/supabase/server';
import { nowManilaDatetimeLocal } from '@/lib/manila-time';
import AnnouncementForm from '../AnnouncementForm';

export default async function NewAnnouncementPage() {
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