// src/lib/status.test.ts
import { describe, it, expect } from "vitest";
import { getTripStatus, type StatusAnnouncement, type StatusOptions } from "./status";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fixed "now": 2026-09-21 10:00 in Manila (= 2026-09-21T02:00:00Z).
// "Today" in Manila is therefore 2026-09-21.
const NOW = "2026-09-21T10:00:00+08:00";
const NOW_MS = Date.parse(NOW);

const ROUTE_A = "route-a"; // the trip's route
const ROUTE_B = "route-b"; // some other route

const hoursAgo = (h: number): string =>
  new Date(NOW_MS - h * 60 * 60 * 1000).toISOString();

// Older than the 48-hour freshness window. Used where a test should be decided
// by the effective window alone, not by "a recent update exists".
const STALE = hoursAgo(60);

const TRIP_DATE = "2026-09-23"; // 2 days from today, inside the 7-day horizon

const EXPL_NO_UPDATE = "No update recorded in the last 48 hours.";
const EXPL_TOO_FAR =
  "This trip is more than 7 days away, so there is not enough information yet.";
const EXPL_PASSED = "This trip date has passed.";

/** Builds a test announcement. Defaults: active, official, on ROUTE_A, published 1h ago. */
function ann(overrides: Partial<StatusAnnouncement> = {}): StatusAnnouncement {
  return {
    id: "a1",
    title: "Test announcement",
    type: "General Information",
    status: "ACTIVE",
    impact: "NONE",
    publishedAt: hoursAgo(1),
    effectiveFrom: null,
    effectiveUntil: null,
    routeIds: [ROUTE_A],
    appliesToAllRoutes: false,
    sourceIsOfficial: true,
    sourceIsActive: true,
    ...overrides,
  };
}

/** Runs getTripStatus for a trip on ROUTE_A with the fixed "now". */
function run(travelDate: string, anns: StatusAnnouncement[], options?: StatusOptions) {
  return getTripStatus({ routeId: ROUTE_A, travelDate }, anns, NOW, options);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  );
}

// ---------------------------------------------------------------------------
// Core tests (1–19)
// ---------------------------------------------------------------------------

describe("getTripStatus", () => {
  it("1. Cancellation on the trip's route and date -> DISRUPTED", () => {
    const result = run(TRIP_DATE, [ann({ id: "c1", title: "Trip cancelled", type: "Cancellation" })]);
    expect(result.status).toBe("DISRUPTED");
    expect(result.reasons).toEqual([
      { announcementId: "c1", title: "Trip cancelled", type: "Cancellation" },
    ]);
  });

  it("2. Suspension -> DISRUPTED", () => {
    const result = run(TRIP_DATE, [ann({ type: "Suspension" })]);
    expect(result.status).toBe("DISRUPTED");
  });

  it("3. Only a weather advisory -> MONITOR", () => {
    const result = run(TRIP_DATE, [ann({ id: "w1", type: "Weather Advisory" })]);
    expect(result.status).toBe("MONITOR");
    expect(result.reasons.map((r) => r.announcementId)).toEqual(["w1"]);
  });

  it("4. Schedule change -> MONITOR", () => {
    const result = run(TRIP_DATE, [ann({ type: "Schedule Change" })]);
    expect(result.status).toBe("MONITOR");
  });

  it("5. Cancellation plus weather advisory -> DISRUPTED, and reasons include the cancellation", () => {
    const result = run(TRIP_DATE, [
      ann({ id: "w1", type: "Weather Advisory" }),
      ann({ id: "c1", type: "Cancellation" }),
    ]);
    expect(result.status).toBe("DISRUPTED");
    expect(result.reasons.map((r) => r.announcementId)).toContain("c1");
  });

  it("6. Announcement for a different route is ignored", () => {
    const result = run(TRIP_DATE, [ann({ type: "Cancellation", routeIds: [ROUTE_B] })]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasons).toEqual([]);
  });

  it("7. An announcement that applies to all routes counts", () => {
    const result = run(TRIP_DATE, [
      ann({ type: "Cancellation", routeIds: [], appliesToAllRoutes: true }),
    ]);
    expect(result.status).toBe("DISRUPTED");
  });

  it("8. Inactive/archived announcement is ignored (RESOLVED, WITHDRAWN, archived source)", () => {
    const ignored: Partial<StatusAnnouncement>[] = [
      { status: "RESOLVED" },
      { status: "WITHDRAWN" },
      { sourceIsActive: false }, // announcement from an archived source
    ];
    for (const override of ignored) {
      const result = run(TRIP_DATE, [ann({ type: "Cancellation", ...override })]);
      expect(result.status, JSON.stringify(override)).toBe("UNKNOWN");
      expect(result.reasons, JSON.stringify(override)).toEqual([]);
    }
  });

  it("9. Effective window ended before the travel day -> ignored", () => {
    // Published long ago (STALE) so only the window decides the outcome.
    const result = run(TRIP_DATE, [
      ann({
        type: "Cancellation",
        publishedAt: STALE,
        effectiveFrom: "2026-09-19T00:00:00+08:00",
        effectiveUntil: "2026-09-22T23:59:00+08:00", // ended before Sept 23 begins
      }),
    ]);
    expect(result.status).not.toBe("DISRUPTED");
    expect(result.status).toBe("UNKNOWN");
  });

  it("10. Effective window starts after the travel day -> ignored", () => {
    const result = run(TRIP_DATE, [
      ann({
        type: "Cancellation",
        publishedAt: STALE,
        effectiveFrom: "2026-09-24T00:00:00+08:00", // starts after Sept 23 ends
        effectiveUntil: null,
      }),
    ]);
    expect(result.status).not.toBe("DISRUPTED");
    expect(result.status).toBe("UNKNOWN");
  });

  it("11a. Time zone: effective_from 2026-09-25T17:00:00Z (1:00 AM Sept 26 Manila) does NOT affect a Sept 25 trip", () => {
    const result = run("2026-09-25", [
      ann({
        type: "Cancellation",
        publishedAt: STALE,
        effectiveFrom: "2026-09-25T17:00:00Z",
      }),
    ]);
    expect(result.status).not.toBe("DISRUPTED");
    expect(result.status).toBe("UNKNOWN");
  });

  it("11b. Time zone: effective_until 2026-09-25T15:59:00Z (11:59 PM Sept 25 Manila) DOES affect a Sept 25 trip", () => {
    const result = run("2026-09-25", [
      ann({
        type: "Cancellation",
        publishedAt: STALE,
        effectiveUntil: "2026-09-25T15:59:00Z",
      }),
    ]);
    expect(result.status).toBe("DISRUPTED");
  });

  it("12. published_at in the future is ignored", () => {
    const result = run(TRIP_DATE, [ann({ type: "Cancellation", publishedAt: hoursAgo(-1) })]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasons).toEqual([]);
  });

  it("13. General Information published 20 hours ago, trip in 3 days -> NORMAL", () => {
    const result = run("2026-09-24", [
      ann({ id: "gi-1", title: "Daily check-in", publishedAt: hoursAgo(20) }),
    ]);
    expect(result.status).toBe("NORMAL");
    expect(result.reasons).toEqual([
      { announcementId: "gi-1", title: "Daily check-in", type: "General Information" },
    ]);
    // 20 hours before Sept 21 10:00 Manila is Sept 20, 14:00 Manila.
    expect(result.explanation).toBe(
      "No known disruption recorded as of September 20, 2026. Latest update: Daily check-in.",
    );
  });

  it("14. No announcements -> UNKNOWN", () => {
    const result = run(TRIP_DATE, []);
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasons).toEqual([]);
    expect(result.explanation).toBe(EXPL_NO_UPDATE);
  });

  it("15. Latest announcement published 60 hours ago (older than 48 hours), trip in 3 days -> UNKNOWN", () => {
    const result = run("2026-09-24", [
      ann({ id: "latest", publishedAt: hoursAgo(60) }),
      ann({ id: "older", publishedAt: hoursAgo(100) }),
    ]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.explanation).toBe(EXPL_NO_UPDATE);
  });

  it("16. Trip 12 days away with no matching announcements -> UNKNOWN; a cancellation for that day still gives DISRUPTED", () => {
    const farDate = "2026-10-03"; // 12 days after 2026-09-21

    const none = run(farDate, []);
    expect(none.status).toBe("UNKNOWN");
    expect(none.explanation).toBe(EXPL_TOO_FAR);

    // Even a fresh General Information cannot make a far-away trip NORMAL.
    const freshInfo = run(farDate, [ann()]);
    expect(freshInfo.status).toBe("UNKNOWN");
    expect(freshInfo.explanation).toBe(EXPL_TOO_FAR);

    const cancelled = run(farDate, [ann({ type: "Cancellation" })]);
    expect(cancelled.status).toBe("DISRUPTED");
  });

  it("17. Trip date already passed -> UNKNOWN with explanation \"This trip date has passed.\"", () => {
    const result = run("2026-09-20", [ann({ type: "Cancellation" })]);
    expect(result.status).toBe("UNKNOWN");
    expect(result.reasons).toEqual([]);
    expect(result.explanation).toBe("This trip date has passed.");
    expect(result.explanation).toBe(EXPL_PASSED);
  });

  it("18. Inputs are not mutated, and shuffling the announcement order gives the same result", () => {
    const trip = deepFreeze({ routeId: ROUTE_A, travelDate: TRIP_DATE });
    const anns = deepFreeze([
      ann({ id: "w1", type: "Weather Advisory", publishedAt: hoursAgo(5) }),
      ann({ id: "c2", type: "Cancellation", publishedAt: hoursAgo(3) }),
      ann({ id: "c1", type: "Suspension", publishedAt: hoursAgo(3) }),
      ann({ id: "g1", publishedAt: hoursAgo(2) }),
    ]);
    const snapshot = JSON.stringify(anns);

    const expected = getTripStatus(trip, anns, NOW);
    for (const order of permutations(anns)) {
      expect(getTripStatus(trip, order, NOW)).toEqual(expected);
    }

    // Frozen inputs would have thrown on mutation; also confirm nothing changed.
    expect(JSON.stringify(anns)).toBe(snapshot);
  });

  it("19. No explanation string contains \"will sail\", \"safe\", or \"guaranteed\"", () => {
    const CAP: StatusOptions = { unofficialSourcePolicy: "CAP_AT_MONITOR" };
    const results = [
      run(TRIP_DATE, [ann({ type: "Cancellation" })]), // DISRUPTED
      run(TRIP_DATE, [ann({ type: "Weather Advisory" })]), // MONITOR
      run(TRIP_DATE, [ann({ type: "Safety Advisory" })]), // MONITOR
      run(TRIP_DATE, [ann({ title: "Daily check-in" })]), // NORMAL
      run(TRIP_DATE, []), // UNKNOWN (no recent update)
      run("2026-10-03", []), // UNKNOWN (too far away)
      run("2026-09-20", []), // UNKNOWN (passed)
      run("2026-02-31", []), // UNKNOWN (invalid date)
      run(TRIP_DATE, [ann({ type: "Cancellation", sourceIsOfficial: false })], CAP), // MONITOR (unofficial)
      run(
        TRIP_DATE,
        [
          ann({ id: "o1", type: "Weather Advisory" }),
          ann({ id: "u1", type: "Cancellation", sourceIsOfficial: false }),
        ],
        CAP,
      ), // MONITOR (mixed)
    ];

    // Guard: the scenarios above exercise every status.
    expect(new Set(results.map((r) => r.status))).toEqual(
      new Set(["NORMAL", "MONITOR", "DISRUPTED", "UNKNOWN"]),
    );

    // Whole-word match, so a "Safety Advisory" title cannot trip the "safe" check.
    const forbidden = /\bwill sail\b|\bsafe\b|\bguaranteed\b/i;
    for (const result of results) {
      expect(result.explanation).not.toMatch(forbidden);
    }
  });
});

// ---------------------------------------------------------------------------
// Extra coverage from earlier decisions (delete this block if not wanted)
// ---------------------------------------------------------------------------

describe("getTripStatus - boundaries, impact and source rules", () => {
  const IGNORE: StatusOptions = { unofficialSourcePolicy: "IGNORE" };
  const CAP: StatusOptions = { unofficialSourcePolicy: "CAP_AT_MONITOR" };

  it("20. Horizon boundary: day 7 -> NORMAL, day 8 -> UNKNOWN (more than 7 days away)", () => {
    const fresh = [ann()];

    expect(run("2026-09-28", fresh).status).toBe("NORMAL"); // today + 7

    const day8 = run("2026-09-29", fresh); // today + 8
    expect(day8.status).toBe("UNKNOWN");
    expect(day8.explanation).toBe(EXPL_TOO_FAR);
  });

  it("21. Freshness boundary: update 48h old -> NORMAL, 49h old -> UNKNOWN", () => {
    expect(run(TRIP_DATE, [ann({ publishedAt: hoursAgo(48) })]).status).toBe("NORMAL");

    const at49 = run(TRIP_DATE, [ann({ publishedAt: hoursAgo(49) })]);
    expect(at49.status).toBe("UNKNOWN");
    expect(at49.explanation).toBe(EXPL_NO_UPDATE);
  });

  it("22. Port Advisory with impact DISRUPTED -> DISRUPTED", () => {
    expect(run(TRIP_DATE, [ann({ type: "Port Advisory", impact: "DISRUPTED" })]).status).toBe("DISRUPTED");
  });

  it("23. Cancellation with impact NONE -> still DISRUPTED (impact never downgrades)", () => {
    expect(run(TRIP_DATE, [ann({ type: "Cancellation", impact: "NONE" })]).status).toBe("DISRUPTED");
  });

  it("24. Schedule Change with impact DISRUPTED -> DISRUPTED", () => {
    expect(run(TRIP_DATE, [ann({ type: "Schedule Change", impact: "DISRUPTED" })]).status).toBe("DISRUPTED");
  });

  it("25. General Information with no impact does not raise status", () => {
    expect(run(TRIP_DATE, [ann({ impact: "NONE" })]).status).toBe("NORMAL");
    expect(run(TRIP_DATE, [ann({ impact: "NONE", publishedAt: hoursAgo(100) })]).status).toBe("UNKNOWN");
  });

  it("26. Announcements from inactive sources are ignored entirely under both policies", () => {
    for (const options of [IGNORE, CAP]) {
      const cancellation = run(TRIP_DATE, [ann({ type: "Cancellation", sourceIsActive: false })], options);
      expect(cancellation.status).toBe("UNKNOWN");

      const info = run(TRIP_DATE, [ann({ sourceIsActive: false })], options);
      expect(info.status).toBe("UNKNOWN");
    }
  });

  it("27. Policy A: unofficial Cancellation never raises status, and unofficial updates do not count for freshness", () => {
    for (const options of [undefined, IGNORE]) {
      const cancellation = run(TRIP_DATE, [ann({ type: "Cancellation", sourceIsOfficial: false })], options);
      expect(cancellation.status).toBe("UNKNOWN");
      expect(cancellation.reasons).toEqual([]);

      const info = run(TRIP_DATE, [ann({ sourceIsOfficial: false })], options);
      expect(info.status).toBe("UNKNOWN");
      expect(info.explanation).toBe(EXPL_NO_UPDATE);
    }
  });

  it("28. Policy B: unofficial Cancellation -> MONITOR (explanation says unofficial source); official Cancellation still wins; unofficial updates do not count for freshness", () => {
    const unofficialCancellation = run(
      TRIP_DATE,
      [ann({ id: "u1", type: "Cancellation", sourceIsOfficial: false })],
      CAP,
    );
    expect(unofficialCancellation.status).toBe("MONITOR");
    expect(unofficialCancellation.reasons.map((r) => r.announcementId)).toEqual(["u1"]);
    expect(unofficialCancellation.explanation).toContain("unofficial source");

    const officialWins = run(
      TRIP_DATE,
      [
        ann({ id: "u1", type: "Cancellation", sourceIsOfficial: false }),
        ann({ id: "o1", type: "Cancellation" }),
      ],
      CAP,
    );
    expect(officialWins.status).toBe("DISRUPTED");
    expect(officialWins.reasons.map((r) => r.announcementId)).toEqual(["o1"]);

    const notFresh = run(TRIP_DATE, [ann({ sourceIsOfficial: false })], CAP);
    expect(notFresh.status).toBe("UNKNOWN");
    expect(notFresh.explanation).toBe(EXPL_NO_UPDATE);
  });
});