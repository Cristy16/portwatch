import { requireUser } from "@/lib/auth";

export default async function TripsPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">My Trips</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Signed in as {user.email}
      </p>
      <p className="mt-6 rounded-md border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
        Your saved trips will appear here in a later phase.
      </p>
    </main>
  );
}