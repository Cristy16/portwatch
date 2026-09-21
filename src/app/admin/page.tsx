import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  // Checked here as well as in the layout, since layouts don't re-run on
  // every client-side navigation.
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <p className="mt-6 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        Announcement and source management will go here in a later phase.
      </p>
    </main>
  );
}