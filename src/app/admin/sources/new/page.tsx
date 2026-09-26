// src/app/admin/sources/new/page.tsx
import { requireAdmin } from '@/lib/auth';
import SourceForm from '../SourceForm';

export default async function NewSourcePage() {
  await requireAdmin();

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">New source</h1>
      <SourceForm />
    </div>
  );
}