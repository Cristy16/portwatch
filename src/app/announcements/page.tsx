// src/app/announcements/page.tsx
import { createClient } from "@/lib/supabase/server";
import { listPublicAnnouncements } from "@/lib/queries/announcements";
import { listActiveRoutes } from "@/lib/queries/routes";
import AnnouncementCard from "@/components/AnnouncementCard";
import type { StatusAnnouncementType } from "@/lib/status";
import Link from "next/link";

const ANNOUNCEMENT_TYPES: StatusAnnouncementType[] = [
  "Cancellation",
  "Suspension",
  "Schedule Change",
  "Weather Advisory",
  "Port Advisory",
  "Safety Advisory",
  "General Information",
];

interface AnnouncementsPageProps {
  searchParams: Promise<{ type?: string; routeId?: string; q?: string }>;
}

export default async function AnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const type =
    params.type && ANNOUNCEMENT_TYPES.includes(params.type as StatusAnnouncementType)
      ? (params.type as StatusAnnouncementType)
      : undefined;

  const [announcements, routes] = await Promise.all([
    listPublicAnnouncements(supabase, {
      type,
      routeId: params.routeId || undefined,
      q: params.q || undefined,
    }),
    listActiveRoutes(supabase),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>

      <form method="get" className="flex flex-wrap gap-3 rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-xs font-medium text-gray-600">Type</label>
          <select id="type" name="type" defaultValue={params.type ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="">All types</option>
            {ANNOUNCEMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="routeId" className="text-xs font-medium text-gray-600">Route</label>
          <select id="routeId" name="routeId" defaultValue={params.routeId ?? ""} className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="">All routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="q" className="text-xs font-medium text-gray-600">Search</label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={params.q ?? ""}
            placeholder="Search title or description"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>

        <div className="flex items-end gap-2">
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800">
            Apply
          </button>
          <Link href="/announcements" className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </Link>
        </div>
      </form>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements match these filters.</p>
        ) : (
          announcements.map((a) => (
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
    </div>
  );
}