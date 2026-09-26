// src/app/admin/announcements/actions.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { manilaEndOfDayToUTC, manilaLocalToUTC } from '@/lib/manila-time';

const ANNOUNCEMENT_TYPES = [
  'Cancellation',
  'Suspension',
  'Schedule Change',
  'Weather Advisory',
  'Port Advisory',
  'Safety Advisory',
  'General Information',
] as const;

const IMPACT_LEVELS = ['NONE', 'MONITOR', 'DISRUPTED'] as const;
const STATUSES = ['ACTIVE', 'RESOLVED', 'WITHDRAWN'] as const;
const SEVERE_TYPES = ['Cancellation', 'Suspension'] as const;

const announcementSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string().trim().min(1, 'Description is required'),
    type: z.enum(ANNOUNCEMENT_TYPES),
    impact: z.enum(IMPACT_LEVELS),
    source_id: z.string().trim().min(1, 'Source is required'),
    source_url: z
      .string()
      .trim()
      .min(1, 'Source URL is required')
      .url('Source URL must be a valid URL'),
    published_at: z.string().trim().min(1, 'Published date is required'),
    effective_from: z.string().trim().optional().or(z.literal('')),
    effective_until: z.string().trim().optional().or(z.literal('')),
    applies_to_all_routes: z.boolean(),
    route_ids: z.array(z.string()),
    status: z.enum(STATUSES),
  })
  .refine((data) => data.applies_to_all_routes || data.route_ids.length > 0, {
    message: 'Select at least one route, or check "Applies to all routes."',
    path: ['route_ids'],
  });

type AnnouncementInput = z.infer<typeof announcementSchema>;

export type AnnouncementFormState = { error?: string };

function parseAnnouncementForm(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    type: formData.get('type'),
    impact: formData.get('impact'),
    source_id: formData.get('source_id'),
    source_url: formData.get('source_url'),
    published_at: formData.get('published_at'),
    effective_from: formData.get('effective_from'),
    effective_until: formData.get('effective_until'),
    applies_to_all_routes: formData.get('applies_to_all_routes') === 'on',
    route_ids: formData.getAll('route_ids').map(String),
    status: formData.get('status'),
  });
}

async function saveAnnouncement(
  id: string | null,
  data: AnnouncementInput
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Server-side enforcement: Cancellation/Suspension require an official source.
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id, official')
    .eq('id', data.source_id)
    .single();

  if (sourceError || !source) {
    return { error: 'Selected source could not be found.' };
  }
  if (
    SEVERE_TYPES.includes(data.type as (typeof SEVERE_TYPES)[number]) &&
    !source.official
  ) {
    return { error: 'Cancellations and Suspensions require an official source.' };
  }

  // resolved_at rule: set on transition INTO RESOLVED, cleared on transition
  // AWAY from RESOLVED, left untouched if status stays RESOLVED across an edit.
  let previousStatus: string | null = null;
  if (id) {
    const { data: existing, error: existingError } = await supabase
      .from('announcements')
      .select('status')
      .eq('id', id)
      .single();
    if (existingError || !existing) {
      return { error: 'Announcement could not be found.' };
    }
    previousStatus = existing.status;
  }

  const record: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    type: data.type,
    impact: data.impact,
    source_id: data.source_id,
    source_url: data.source_url,
    published_at: manilaLocalToUTC(data.published_at),
    effective_from: data.effective_from ? manilaLocalToUTC(data.effective_from) : null,
    effective_until: data.effective_until ? manilaEndOfDayToUTC(data.effective_until) : null,
    applies_to_all_routes: data.applies_to_all_routes,
    status: data.status,
  };

  if (data.status === 'RESOLVED') {
    if (previousStatus !== 'RESOLVED') {
      record.resolved_at = new Date().toISOString();
    }
    // else: status stays RESOLVED across this edit — leave resolved_at untouched.
  } else {
    record.resolved_at = null;
  }

  const isNewAnnouncement = id === null;
  let announcementId = id;

  if (announcementId) {
    const { error } = await supabase
      .from('announcements')
      .update(record)
      .eq('id', announcementId);
    if (error) return { error: error.message };

    const { error: deleteError } = await supabase
      .from('announcement_routes')
      .delete()
      .eq('announcement_id', announcementId);
    if (deleteError) return { error: deleteError.message };
  } else {
    const { data: inserted, error } = await supabase
      .from('announcements')
      .insert(record)
      .select('id')
      .single();
    if (error) return { error: error.message };
    announcementId = inserted.id;
  }

  if (!data.applies_to_all_routes && data.route_ids.length > 0) {
    const rows = data.route_ids.map((route_id) => ({
      announcement_id: announcementId,
      route_id,
    }));
    const { error: routesError } = await supabase.from('announcement_routes').insert(rows);
    if (routesError) {
      if (isNewAnnouncement) {
        // The announcement row was just created and would otherwise be left
        // pointing at zero routes with no "applies to all" fallback either —
        // an orphan with no purpose. Clean it up rather than leave it stranded.
        // (Update path is NOT rolled back here — see Finding #3 discussion:
        // that would require snapshotting pre-update state on every save.)
        await supabase.from('announcements').delete().eq('id', announcementId);
      }
      return { error: routesError.message };
    }
  }

  return {};
}

export async function createAnnouncement(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  await requireAdmin();

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const result = await saveAnnouncement(null, parsed.data);
  if (result.error) return result;

  revalidatePath('/admin/announcements');
  redirect(`/admin/announcements?success=${encodeURIComponent('Announcement created.')}`);
}

export async function updateAnnouncement(
  id: string,
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  await requireAdmin();

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const result = await saveAnnouncement(id, parsed.data);
  if (result.error) return result;

  revalidatePath('/admin/announcements');
  redirect(`/admin/announcements?success=${encodeURIComponent('Announcement updated.')}`);
}

export async function archiveAnnouncement(id: string): Promise<{ error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .update({ status: 'WITHDRAWN', resolved_at: null })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/announcements');
  return {};
}