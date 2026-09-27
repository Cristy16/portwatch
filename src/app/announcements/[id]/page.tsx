// src/app/announcements/[id]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAnnouncementById } from "@/lib/queries/announcements";
import { formatManilaDateTime } from "@/lib/manila-time";

interface AnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementDetailPage({ params }: AnnouncementDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const announcement = await getAnnouncementById(supabase, id);

  if (!announcement) {
    notFound();
  }

  const {
    title,
    description,
    type,
    publishedAt,
    effectiveFrom,
    effectiveUntil,
    sourceName,
    sourceUrl,
    sourceIsOfficial,
  } = announcement;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {type}
        </span>
        {!sourceIsOfficial && (
          <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
            Unofficial source
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

      {description && <p className="whitespace-pre-wrap text-gray-700">{description}</p>}

      <dl className="space-y-2 rounded-lg border border-gray-200 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Published</dt>
          <dd className="text-gray-800">{formatManilaDateTime(publishedAt)}</dd>
        </div>
        {(effectiveFrom || effectiveUntil) && (
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Effective</dt>
            <dd className="text-gray-800">
              {effectiveFrom ? formatManilaDateTime(effectiveFrom) : "now"}
              {" \u2013 "}
              {effectiveUntil ? formatManilaDateTime(effectiveUntil) : "until further notice"}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Source</dt>
          <dd className="text-gray-800">
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {sourceName}
            </a>
          </dd>
        </div>
      </dl>

      <p className="text-xs text-gray-400">
        PortWatch is an information service and does not confirm sailings.
      </p>
    </div>
  );
}