// src/app/routes/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRouteStatus } from "@/lib/queries/route-status";
import { listActiveRoutes } from "@/lib/queries/routes";
import StatusBadge from "@/components/StatusBadge";

export default async function RoutesPage() {
  const supabase = await createClient();
  const now = new Date();

  const routes = await listActiveRoutes(supabase);

  const routesWithStatus = await Promise.all(
    routes.map(async (route) => ({
      ...route,
      result: await getCurrentRouteStatus(supabase, route.id, now),
    }))
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Routes</h1>

      <div className="space-y-3">
        {routesWithStatus.length === 0 ? (
          <p className="text-sm text-gray-500">No active routes.</p>
        ) : (
          routesWithStatus.map(({ id, name, result }) => (
            <div key={id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium text-gray-900">{name}</p>
                <p className="mt-1 text-sm text-gray-500">{result.explanation}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={result.status} />
                <Link href={`/announcements?routeId=${id}`} className="text-sm text-blue-600 hover:underline">
                  View announcements
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}