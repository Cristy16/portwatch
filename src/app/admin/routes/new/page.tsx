// src/app/admin/routes/new/page.tsx
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RouteForm from '../RouteForm';

export default async function NewRoutePage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: ports } = await supabase.from('ports').select('id, name').order('name');

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">New route</h1>

      {!ports || ports.length === 0 ? (
        <p className="text-sm text-gray-700">
          No ports exist yet. Add ports via SQL first, then come back to create a route.{' '}
          <Link href="/admin/routes" className="text-blue-600 underline">
            Back to routes
          </Link>
        </p>
      ) : (
        <RouteForm ports={ports} />
      )}
    </div>
  );
}