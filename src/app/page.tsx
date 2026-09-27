// src/app/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOverallStatus } from "@/lib/queries/route-status";
import { listPublicAnnouncements } from "@/lib/queries/announcements";
import { listActiveRoutes } from "@/lib/queries/routes";
import StatusBadge from "@/components/StatusBadge";
import AnnouncementCard from "@/components/AnnouncementCard";

const RECENT_ANNOUNCEMENTS_LIMIT = 5;

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date();

  const [overall, recent, routes] = await Promise.all([
    getOverallStatus(supabase, now),
    listPublicAnnouncements(supabase),
    listActiveRoutes(supabase),
  ]);

  const recentAnnouncements = recent.slice(0, RECENT_ANNOUNCEMENTS_LIMIT);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        PortWatch is an information service, not an official service. It does
        not confirm sailings — always verify with the port authority or
        operator before you travel.
      </div>

      <section>
        <h1 className="text-2xl font-bold text-gray-900">Pilar Port Travel Status</h1>
        <div className="mt-3 flex items-center gap-3">
          <StatusBadge status={overall.status} />
          <span className="text-sm text-gray-500">across {routes.length} route{routes.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
          <Link href="/announcements" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-gray-500">No active announcements right now.</p>
          ) : (
            recentAnnouncements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={{
                  id: a.id,
                  title: a.title,
                  type: a.type,
                  publishedAt: a.publishedAt,
                  sourceName: a.sourceName,
                  sourceIsOfficial: a.sourceIsOfficial,
                  effectiveFrom: a.effectiveFrom,
                  effectiveUntil: a.effectiveUntil,
                }}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Routes</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {routes.map((route) => (
            <Link
              key={route.id}
              href={`/announcements?routeId=${route.id}`}
              className="rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-800 hover:border-gray-300 hover:shadow-sm"
            >
              {route.name}
            </Link>
          ))}
        </div>
        <Link href="/routes" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          View route statuses
        </Link>
      </section>
    </div>
  );
}