'use client';

import { useActionState } from 'react';
import { createSource, updateSource, type SourceFormState } from './actions';

const SOURCE_TYPES = [
  { value: 'official_government', label: 'Official Government' },
  { value: 'ferry_operator', label: 'Ferry Operator' },
  { value: 'news_media', label: 'News Media' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
] as const;

type Source = {
  id: string;
  name: string;
  source_type: string;
  url: string;
  official: boolean;
  active: boolean;
};

export default function SourceForm({ source }: { source?: Source }) {
  const isEdit = !!source;
  const action = isEdit ? updateSource.bind(null, source.id) : createSource;
  const [state, formAction, isPending] = useActionState<SourceFormState, FormData>(action, {});

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={source?.name}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="source_type" className="block text-sm font-medium text-gray-700">
          Source Type
        </label>
        <select
          id="source_type"
          name="source_type"
          defaultValue={source?.source_type ?? SOURCE_TYPES[0].value}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          defaultValue={source?.url}
          required
          placeholder="https://..."
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="official"
          name="official"
          type="checkbox"
          defaultChecked={source?.official}
          className="h-4 w-4"
        />
        <label htmlFor="official" className="text-sm text-gray-700">
          Official source
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={source?.active ?? true}
          className="h-4 w-4"
        />
        <label htmlFor="active" className="text-sm text-gray-700">
          Active
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create source'}
      </button>
    </form>
  );
}