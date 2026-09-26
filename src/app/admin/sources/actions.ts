'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const SOURCE_TYPES = [
  'official_government',
  'ferry_operator',
  'news_media',
  'social_media',
  'other',
] as const;

const sourceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  source_type: z.enum(SOURCE_TYPES),
  url: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .refine((v) => /^https?:\/\//.test(v), 'URL must start with http:// or https://'),
  official: z.boolean(),
  active: z.boolean(),
});

export type SourceFormState = { error?: string };

function parseSourceForm(formData: FormData) {
  return sourceSchema.safeParse({
    name: formData.get('name'),
    source_type: formData.get('source_type'),
    url: formData.get('url'),
    official: formData.get('official') === 'on',
    active: formData.get('active') === 'on',
  });
}

export async function createSource(
  _prevState: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  await requireAdmin();

  const parsed = parseSourceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('sources').insert(parsed.data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/sources');
  redirect(`/admin/sources?success=${encodeURIComponent('Source created.')}`);
}

export async function updateSource(
  id: string,
  _prevState: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  await requireAdmin();

  const parsed = parseSourceForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('sources').update(parsed.data).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/sources');
  redirect(`/admin/sources?success=${encodeURIComponent('Source updated.')}`);
}

export async function toggleSourceActive(
  id: string,
  active: boolean
): Promise<{ error?: string }> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('sources').update({ active }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin/sources');
  return {};
}