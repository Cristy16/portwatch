// src/lib/status.integration.test.ts
//
// TEMPORARY. Hits real Supabase data — proves getStatusAnnouncementsForRoute's
// output shape actually satisfies getTripStatus's input type. Not meant to stay
// in the suite long-term; delete once Phase 6 has its own tests using this mapper.
//
// Uses createTestClient() (plain @supabase/supabase-js client, no cookies()
// dependency) instead of the app's server.ts client, since Vitest has no
// Next.js request context for cookies() to run in.
//
// Requires a route ID that has real data. Set TEST_ROUTE_ID env var or edit below.

import { describe, it, expect } from 'vitest';
import { createTestClient } from './supabase/test-client';
import { getStatusAnnouncementsForRoute } from './queries/announcements';
import { getTripStatus, type StatusTrip } from './status';

const TEST_ROUTE_ID = process.env.TEST_ROUTE_ID ?? 'b0000000-0000-4000-8000-000000000001';

describe('status.ts against real Supabase data (integration, temporary)', () => {
  it('produces a valid status for a trip today on a real route', async () => {
    const supabase = createTestClient();

    const announcements = await getStatusAnnouncementsForRoute(supabase, TEST_ROUTE_ID);

    console.log(`Fetched ${announcements.length} active announcement(s) for route ${TEST_ROUTE_ID}`);
    console.log(announcements);

    const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD", Manila-adjacent enough for a smoke test
    const trip: StatusTrip = { routeId: TEST_ROUTE_ID, travelDate: today };
    const now = new Date();

    // No unofficialSourcePolicy passed => uses status.ts's own DEFAULT_UNOFFICIAL_SOURCE_POLICY (CAP_AT_MONITOR).
    const result = getTripStatus(trip, announcements, now);

    console.log('getTripStatus result:', result);

    expect(['NORMAL', 'MONITOR', 'DISRUPTED', 'UNKNOWN']).toContain(result.status);
    expect(typeof result.explanation).toBe('string');
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(typeof result.computedAt).toBe('string');
  });
});