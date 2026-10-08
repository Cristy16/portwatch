// src/components/AnnouncementCard.tsx
import Link from "next/link";
import { formatManilaDateTime } from "@/lib/manila-time";
import type { StatusAnnouncementType } from "@/lib/status";

export interface AnnouncementCardData {
  id: string;
  title: string;
  type: StatusAnnouncementType;
  publishedAt: string;
  sourceName: string;
  sourceIsOfficial: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

interface AnnouncementCardProps {
  announcement: AnnouncementCardData;
}

export default function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const {
    id,
    title,
    type,
    publishedAt,
    sourceName,
    sourceIsOfficial,
    effectiveFrom,
    effectiveUntil,
  } = announcement;

  return (
    <Link
      href={`/announcements/${id}`}
      className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm"
    >
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

      <h3 className="mt-2 text-base font-semibold text-gray-900">{title}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
        <span>{sourceName}</span>
        <span aria-hidden="true">&middot;</span>
        <span>Published {formatManilaDateTime(publishedAt)}</span>
      </div>

      {(effectiveFrom || effectiveUntil) && (
        <p className="mt-1 text-sm text-gray-500">
          Effective {effectiveFrom ? formatManilaDateTime(effectiveFrom) : "now"}
          {" \u2013 "}
          {effectiveUntil ? formatManilaDateTime(effectiveUntil) : "until further notice"}
        </p>
      )}
    </Link>
  );
}