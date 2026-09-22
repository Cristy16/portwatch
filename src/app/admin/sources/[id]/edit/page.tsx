import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SourceForm from '../../SourceForm';

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: source } = await supabase
    .from('sources')
    .select('id, name, source_type, url, official, active')
    .eq('id', id)
    .single();

  if (!source) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Edit source</h1>
      <SourceForm source={source} />
    </div>
  );
}