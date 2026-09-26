'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const routeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    origin_port_id: z.string().trim().min(1, 'Origin port is required'),
    destination_port_id: z.string().trim().min(1, 'Destination port is required'),
    active: z.boolean(),
  })
  .refine((data) => data.origin_port_id !== data.destination_port_id, {
    message: 'Origin and destination must be different ports',
    path: ['destination_port_id'],
  });

export type RouteFormState = { error?: string };

function parseRouteForm(formData: FormData) {
  return routeSchema.safeParse({
    name: formData.get('name'),
    origin_port_id: formData.get('origin_port_id'),
    destination_port_id: formData.get('destination_port_id'),
    active: formData.get('active') === 'on',
  });
}

export async function createRoute(
  _prevState: RouteFormState,
  formData: FormData
): Promise<RouteFormState> {
  await requireAdmin();

  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('routes').insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/routes');
  redirect(`/admin/routes?success=${encodeURIComponent('Route created.')}`);
}

export async function updateRoute(
  id: string,
  _prevState: RouteFormState,
  formData: FormData
): Promise<RouteFormState> {
  await requireAdmin();

  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('routes').update(parsed.data).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/routes');
  redirect(`/admin/routes?success=${encodeURIComponent('Route updated.')}`);
}

export async function toggleRouteActive(
  id: string,
  active: boolean
): Promise<{ error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('routes').update({ active }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/routes');
  return {};
}