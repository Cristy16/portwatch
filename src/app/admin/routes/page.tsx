// src/app/admin/routes/page.tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RouteRow from './RouteRow';

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  await requireAdmin();

  const { success } = await searchParams;
  const supabase = await createClient();
  const { data: routes, error: fetchError } = await supabase
    .from('routes')
    .select(
      `id, name, active,
       origin_port:ports!routes_origin_port_id_fkey(name),
       destination_port:ports!routes_destination_port_id_fkey(name)`
    )
    .order('name');

  const rows =
    routes?.map((r) => ({
      id: r.id,
      name: r.name,
      active: r.active,
      origin_port_name: (r.origin_port as unknown as { name: string } | null)?.name ?? 'Unknown',
      destination_port_name:
        (r.destination_port as unknown as { name: string } | null)?.name ?? 'Unknown',
    })) ?? [];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Routes</h1>
        <Link href="/admin/routes/new" className="rounded bg-blue-600 px-4 py-2 text-white">
          New route
        </Link>
      </div>

      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}
      {fetchError && (
        <p className="mb-4 text-sm text-red-600">Failed to load routes: {fetchError.message}</p>
      )}

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Origin</th>
            <th className="py-2 pr-4">Destination</th>
            <th className="py-2 pr-4">Active</th>
            <th className="py-2 pr-4">Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((route) => (
            <RouteRow key={route.id} route={route} />
          ))}
        </tbody>
      </table>
    </div>
  );
}