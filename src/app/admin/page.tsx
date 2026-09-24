import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { sevenDaysAgoISO } from '@/lib/manila-time';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const sevenDaysAgo = sevenDaysAgoISO();

  const [
    { count: totalAnnouncements },
    { count: activeAnnouncements },
    { count: recentAnnouncements },
    { count: totalRoutes },
    { count: totalSources },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from('announcements').select('*', { count: 'exact', head: true }),
    supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE'),
    supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),
    supabase.from('routes').select('*', { count: 'exact', head: true }),
    supabase.from('sources').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ]);

  const cards = [
    { label: 'Total announcements', value: totalAnnouncements },
    { label: 'Active announcements', value: activeAnnouncements },
    { label: 'Added in last 7 days', value: recentAnnouncements },
    { label: 'Total routes', value: totalRoutes },
    { label: 'Total sources', value: totalSources },
    { label: 'Total users', value: totalUsers },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded border border-gray-300 p-4">
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/admin/sources" className="rounded bg-blue-600 px-4 py-2 text-white">
          Manage sources
        </Link>
        <Link href="/admin/routes" className="rounded bg-blue-600 px-4 py-2 text-white">
          Manage routes
        </Link>
        <Link href="/admin/announcements" className="rounded bg-blue-600 px-4 py-2 text-white">
          Manage announcements
        </Link>
      </div>
    </div>
  );
}