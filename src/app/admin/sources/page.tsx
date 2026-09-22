import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SourceRow from './SourceRow';

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: sources, error: fetchError } = await supabase
    .from('sources')
    .select('id, name, source_type, url, official, active')
    .order('name');

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sources</h1>
        <Link href="/admin/sources/new" className="rounded bg-blue-600 px-4 py-2 text-white">
          New source
        </Link>
      </div>

      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}
      {fetchError && (
        <p className="mb-4 text-sm text-red-600">Failed to load sources: {fetchError.message}</p>
      )}

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Official</th>
            <th className="py-2 pr-4">Active</th>
            <th className="py-2 pr-4">Edit</th>
          </tr>
        </thead>
        <tbody>
          {sources?.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </tbody>
      </table>
    </div>
  );
}