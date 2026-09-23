'use client';

import { useActionState } from 'react';
import { createRoute, updateRoute, type RouteFormState } from './actions';

type Port = { id: string; name: string };

type Route = {
  id: string;
  name: string;
  origin_port_id: string;
  destination_port_id: string;
  active: boolean;
};

export default function RouteForm({
  route,
  ports,
}: {
  route?: Route;
  ports: Port[];
}) {
  const isEdit = !!route;
  const action = isEdit ? updateRoute.bind(null, route.id) : createRoute;
  const [state, formAction, isPending] = useActionState<RouteFormState, FormData>(action, {});

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
          defaultValue={route?.name}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="origin_port_id" className="block text-sm font-medium text-gray-700">
          Origin port
        </label>
        <select
          id="origin_port_id"
          name="origin_port_id"
          defaultValue={route?.origin_port_id ?? ''}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Select a port
          </option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="destination_port_id" className="block text-sm font-medium text-gray-700">
          Destination port
        </label>
        <select
          id="destination_port_id"
          name="destination_port_id"
          defaultValue={route?.destination_port_id ?? ''}
          required
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            Select a port
          </option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={route?.active ?? true}
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
        {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Create route'}
      </button>
    </form>
  );
}