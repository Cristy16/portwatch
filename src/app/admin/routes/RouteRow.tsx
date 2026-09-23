'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toggleRouteActive } from './actions';

type Route = {
  id: string;
  name: string;
  origin_port_name: string;
  destination_port_name: string;
  active: boolean;
};

export default function RouteRow({ route }: { route: Route }) {
  const [active, setActive] = useState(route.active);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !active;
    setError(null);
    startTransition(async () => {
      const result = await toggleRouteActive(route.id, next);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setActive(next);
    });
  }

  return (
    <tr className="border-b border-gray-200">
      <td className="py-2 pr-4">{route.name}</td>
      <td className="py-2 pr-4">{route.origin_port_name}</td>
      <td className="py-2 pr-4">{route.destination_port_name}</td>
      <td className="py-2 pr-4">
        {active ? 'Active' : 'Inactive'}
        {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
      </td>
      <td className="py-2 pr-4">
        <Link href={`/admin/routes/${route.id}/edit`} className="text-blue-600 underline">
          Edit
        </Link>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="ml-3 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
        >
          {isPending ? '...' : active ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}