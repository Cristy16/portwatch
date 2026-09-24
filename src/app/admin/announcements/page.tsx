// src/app/admin/announcements/page.tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AnnouncementRow from './AnnouncementRow';

const STATUS_FILTERS = ['all', 'ACTIVE', 'RESOLVED', 'WITHDRAWN'] as const;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; status?: string }>;
}) {
  const { success, status } = await searchParams;
  const activeFilter = (STATUS_FILTERS as readonly string[]).includes(status ?? '')
    ? (status as (typeof STATUS_FILTERS)[number])
    : 'all';

  const supabase = await createClient();
  let query = supabase
    .from('announcements')
    .select('id, title, type, impact, status, published_at')
    .order('published_at', { ascending: false });

  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  const { data: announcements, error: fetchError } = await query;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <Link
          href="/admin/announcements/new"
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          New announcement
        </Link>
      </div>

      <div className="mb-4 flex gap-3 text-sm">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? '/admin/announcements' : `/admin/announcements?status=${f}`}
            className={
              f === activeFilter ? 'font-semibold text-blue-600' : 'text-gray-600 underline'
            }
          >
            {f === 'all' ? 'All' : f[0] + f.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}
      {fetchError && (
        <p className="mb-4 text-sm text-red-600">
          Failed to load announcements: {fetchError.message}
        </p>
      )}

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Impact</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Published</th>
            <th className="py-2 pr-4">Edit</th>
          </tr>
        </thead>
        <tbody>
          {announcements?.map((a) => (
            <AnnouncementRow key={a.id} announcement={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}