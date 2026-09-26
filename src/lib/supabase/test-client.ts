import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Plain client for test/script use only — no cookies, no Next.js request context.
// Never import this into app pages or Server Actions; use server.ts there instead.
export function createTestClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}