// src/app/admin/announcements/AnnouncementForm.tsx
'use client';

import { useActionState, useState } from 'react';
import { createAnnouncement, updateAnnouncement, type AnnouncementFormState } from './actions';

const ANNOUNCEMENT_TYPES = [
  'Cancellation',
  'Suspension',
  'Schedule Change',
  'Weather Advisory',
  'Port Advisory',
  'Safety Advisory',
  'General Information',
] as const;

const IMPACT_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'MONITOR', label: 'Escalates to Monitor' },
  { value: 'DISRUPTED', label: 'Escalates to Disrupted' },
] as const;

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
] as const;

type Source = { id: string; name: string; official: boolean; active: boolean };
type Route = { id: string; name: string; active: boolean };

type Announcement = {
  id: string;
  title: string;
  description: string;
  type: string;
  impact: string;
  source_id: string;
  source_url: string | null;
  published_at: string;
  effective_from: string | null;
  effective_until: string | null;
  applies_to_all_routes: boolean;
  route_ids: string[];
  status: string;
};

export default function AnnouncementForm({
  announcement,
  sources,
  routes,
  defaultPublishedAt,
}: {
  announcement?: Announcement;
  sources: Source[];
  routes: Route[];
  defaultPublishedAt: string;
}) {
  const isEdit = !!announcement;
  const action = isEdit ? updateAnnouncement.bind(null, announcement.id) : createAnnouncement;
  const [state, formAction, isPending] = useActionState<AnnouncementFormState, FormData>(
    action,
    {}
  );
  const [appliesToAll, setAppliesToAll] = useState(announcement?.applies_to_all_routes ?? false);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={announcement?.title}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={announcement?.description}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={announcement?.type ?? ANNOUNCEMENT_TYPES[0]}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          {ANNOUNCEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="impact" className="block text-sm font-medium text-gray-700">
          Effect on travel status
        </label>
        <select
          id="impact"
          name="impact"
          defaultValue={announcement?.impact ?? 'NONE'}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          {IMPACT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          This only raises the status the type already implies — it never lowers it.
        </p>
      </div>

      <div>
        <label htmlFor="source_id" className="block text-sm font-medium text-gray-700">
          Source
        </label>
        <select
          id="source_id"
          name="source_id"
          defaultValue={announcement?.source_id ?? ''}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Select a source
          </option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {!s.active ? ' (inactive)' : ''}
              {!s.official ? ' — unofficial source' : ''}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Cancellations and Suspensions require an official source.
        </p>
      </div>

      <div>
        <label htmlFor="source_url" className="block text-sm font-medium text-gray-700">
          Source URL
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          defaultValue={announcement?.source_url ?? ''}
          required
          placeholder="https://..."
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="published_at" className="block text-sm font-medium text-gray-700">
          Published at
        </label>
        <input
          id="published_at"
          name="published_at"
          type="datetime-local"
          defaultValue={announcement?.published_at ?? defaultPublishedAt}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="effective_from" className="block text-sm font-medium text-gray-700">
          Effective from (optional)
        </label>
        <input
          id="effective_from"
          name="effective_from"
          type="datetime-local"
          defaultValue={announcement?.effective_from ?? ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="effective_until" className="block text-sm font-medium text-gray-700">
          Effective through (whole day)
        </label>
        <input
          id="effective_until"
          name="effective_until"
          type="date"
          defaultValue={announcement?.effective_until ?? ''}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Routes</span>

        <div className="mt-1 flex items-center gap-2">
          <input
            id="applies_to_all_routes"
            name="applies_to_all_routes"
            type="checkbox"
            checked={appliesToAll}
            onChange={(e) => setAppliesToAll(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="applies_to_all_routes" className="text-sm text-gray-700">
            Applies to all routes
          </label>
        </div>

        <div className="mt-2 space-y-1">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <input
                id={`route-${r.id}`}
                name="route_ids"
                type="checkbox"
                value={r.id}
                defaultChecked={announcement?.route_ids?.includes(r.id)}
                disabled={appliesToAll}
                className="h-4 w-4"
              />
              <label htmlFor={`route-${r.id}`} className="text-sm text-gray-700">
                {r.name}
                {!r.active ? ' (inactive)' : ''}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={announcement?.status ?? 'ACTIVE'}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create announcement'}
      </button>
    </form>
  );
}