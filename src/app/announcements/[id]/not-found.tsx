// src/app/announcements/[id]/not-found.tsx
import Link from "next/link";

export default function AnnouncementNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Announcement not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This announcement doesn&apos;t exist or is no longer active.
      </p>
      <Link href="/announcements" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Back to announcements
      </Link>
    </div>
  );
}