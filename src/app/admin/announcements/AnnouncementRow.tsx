'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { archiveAnnouncement } from './actions';

type Announcement = {
  id: string;
  title: string;
  type: string;
  impact: string;
  status: string;
  published_at: string;
};

export default function AnnouncementRow({ announcement }: { announcement: Announcement }) {
  const [status, setStatus] = useState(announcement.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveAnnouncement(announcement.id);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setStatus('WITHDRAWN');
    });
  }

  return (
    <tr className="border-b border-gray-200">
      <td className="py-2 pr-4">{announcement.title}</td>
      <td className="py-2 pr-4">{announcement.type}</td>
      <td className="py-2 pr-4">{announcement.impact}</td>
      <td className="py-2 pr-4">
        {status}
        {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
      </td>
      <td className="py-2 pr-4">{new Date(announcement.published_at).toLocaleString()}</td>
      <td className="py-2 pr-4">
        <Link
          href={`/admin/announcements/${announcement.id}/edit`}
          className="text-blue-600 underline"
        >
          Edit
        </Link>
        {status !== 'WITHDRAWN' && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="ml-3 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            {isPending ? '...' : 'Archive'}
          </button>
        )}
      </td>
    </tr>
  );
}