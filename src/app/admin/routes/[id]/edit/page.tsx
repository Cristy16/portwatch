import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RouteForm from '../../RouteForm';

export default async function EditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: route }, { data: ports }] = await Promise.all([
    supabase
      .from('routes')
      .select('id, name, origin_port_id, destination_port_id, active')
      .eq('id', id)
      .single(),
    supabase.from('ports').select('id, name').order('name'),
  ]);

  if (!route) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit route</h1>
      <RouteForm route={route} ports={ports ?? []} />
    </div>
  );
}