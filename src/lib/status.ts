// src/lib/status.ts
//
// PortWatch travel status rules v0.1 as a PURE function.
// No database calls, no framework imports, no libraries, no Date.now():
// "now" is always passed in, so the same inputs always give the same result.
//
// PortWatch informs. It never predicts or guarantees a sailing.

// ---------------------------------------------------------------------------
// Constants (easy to change)
// ---------------------------------------------------------------------------

/** How many days ahead (from today, Manila time) PortWatch can say NORMAL. */
export const TRAVEL_HORIZON_DAYS = 7;

/** How recent the latest route update must be (in hours) for NORMAL. */
export const UPDATE_FRESHNESS_HOURS = 48;

/**
 * How announcements from UNOFFICIAL sources are treated.
 *  - "IGNORE"         (option A): they can never raise status and do not count
 *                     for freshness.
 *  - "CAP_AT_MONITOR" (option B): they can raise MONITOR at most (an unofficial
 *                     Cancellation gives MONITOR and the explanation says it is
 *                     from an unofficial source). They still do NOT count for
 *                     freshness, because NORMAL should rest on official info.
 * Announcements from INACTIVE sources are always ignored entirely.
 */
export type UnofficialSourcePolicy = "IGNORE" | "CAP_AT_MONITOR";
export const DEFAULT_UNOFFICIAL_SOURCE_POLICY: UnofficialSourcePolicy = "CAP_AT_MONITOR";

// Asia/Manila is fixed UTC+8 with no daylight saving.
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MANILA_OFFSET_MS = 8 * MS_PER_HOUR;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// ---------------------------------------------------------------------------
// Types (own minimal input/output types; map database rows to these later)
// ---------------------------------------------------------------------------

export type StatusAnnouncementType =
  | "Cancellation"
  | "Suspension"
  | "Schedule Change"
  | "Weather Advisory"
  | "Port Advisory"
  | "Safety Advisory"
  | "General Information";

export type StatusAnnouncementState = "ACTIVE" | "RESOLVED" | "WITHDRAWN";

export type StatusAnnouncementImpact = "NONE" | "MONITOR" | "DISRUPTED";

export type TripStatus = "NORMAL" | "MONITOR" | "DISRUPTED" | "UNKNOWN";

export interface StatusAnnouncement {
  id: string;
  title: string;
  type: StatusAnnouncementType;
  /** Lifecycle of the record (only ACTIVE counts). */
  status: StatusAnnouncementState;
  /** Travel impact the announcement implies. Can only escalate, never downgrade. */
  impact: StatusAnnouncementImpact;
  /** ISO 8601 with offset, e.g. "2026-09-21T03:00:00+00:00" */
  publishedAt: string;
  /** ISO 8601 with offset, or null = starts at publishedAt */
  effectiveFrom: string | null;
  /** ISO 8601 with offset, or null = no end */
  effectiveUntil: string | null;
  routeIds: readonly string[];
  appliesToAllRoutes: boolean;
  /** Is the announcement's source an official source? */
  sourceIsOfficial: boolean;
  /** Is the announcement's source active (not archived)? */
  sourceIsActive: boolean;
}

export interface StatusTrip {
  routeId: string;
  /** Calendar date in Asia/Manila, "YYYY-MM-DD" */
  travelDate: string;
}

export interface StatusOptions {
  /** Defaults to DEFAULT_UNOFFICIAL_SOURCE_POLICY. */
  unofficialSourcePolicy?: UnofficialSourcePolicy;
}

export interface StatusReason {
  announcementId: string;
  title: string;
  type: StatusAnnouncementType;
}

export interface TripStatusResult {
  status: TripStatus;
  reasons: StatusReason[];
  explanation: string;
  /** `now` as an ISO 8601 UTC string */
  computedAt: string;
}

// ---------------------------------------------------------------------------
// Rule inputs: which types trigger which level
// ---------------------------------------------------------------------------

const DISRUPTING_TYPES: ReadonlySet<StatusAnnouncementType> = new Set([
  "Cancellation",
  "Suspension",
]);

const MONITOR_TYPES: ReadonlySet<StatusAnnouncementType> = new Set([
  "Weather Advisory",
  "Port Advisory",
  "Safety Advisory",
  "Schedule Change",
]);

type Level = "DISRUPTED" | "MONITOR" | "NONE";

/**
 * The level an announcement raises, from its type AND its impact.
 * Impact may only escalate: type alone can already make DISRUPTED or MONITOR,
 * and impact can lift it higher, but a low impact never lowers a type's level.
 */
function raisedLevel(a: StatusAnnouncement): Level {
  if (DISRUPTING_TYPES.has(a.type) || a.impact === "DISRUPTED") {
    return "DISRUPTED";
  }
  if (MONITOR_TYPES.has(a.type) || a.impact === "MONITOR") {
    return "MONITOR";
  }
  return "NONE"; // e.g. General Information with impact NONE
}

// ---------------------------------------------------------------------------
// Small helpers (all pure)
// ---------------------------------------------------------------------------

interface Candidate {
  announcement: StatusAnnouncement;
  publishedMs: number;
  unofficial: boolean;
}

/** ISO string -> epoch ms, or null if missing/unparseable. */
function parseTime(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * "YYYY-MM-DD" -> epoch ms of 00:00 that day in Manila (UTC+8), or null if the
 * string is not a real calendar date.
 */
function parseTravelDayStart(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Round-trip check rejects things like 2026-02-31.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  const ms = Date.parse(`${value}T00:00:00+08:00`);
  return Number.isNaN(ms) ? null : ms;
}

/** epoch ms -> Manila calendar date "YYYY-MM-DD". */
function manilaDateString(ms: number): string {
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** epoch ms -> Manila calendar date for people, e.g. "September 21, 2026". */
function formatManilaDate(ms: number): string {
  const d = new Date(ms + MANILA_OFFSET_MS);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Listed for the trip's route, or applies to all routes. */
function appliesToRoute(a: StatusAnnouncement, routeId: string): boolean {
  return a.appliesToAllRoutes || a.routeIds.includes(routeId);
}

/**
 * Does the announcement's effective window overlap the travel day
 * [dayStartMs, dayEndMs)?
 * effective_from empty = starts at published_at; effective_until empty = no end.
 * An end exactly at the start of the travel day does not cover that day.
 */
function overlapsTravelDay(
  a: StatusAnnouncement,
  publishedMs: number,
  dayStartMs: number,
  dayEndMs: number,
): boolean {
  const startMs = parseTime(a.effectiveFrom) ?? publishedMs;
  const endMs = parseTime(a.effectiveUntil); // null = no end
  return startMs < dayEndMs && (endMs === null || endMs > dayStartMs);
}

/** Newest first; ties broken by id so the order never depends on input order. */
function newestFirst(x: Candidate, y: Candidate): number {
  if (x.publishedMs !== y.publishedMs) return y.publishedMs - x.publishedMs;
  if (x.announcement.id < y.announcement.id) return -1;
  if (x.announcement.id > y.announcement.id) return 1;
  return 0;
}

function toReason(c: Candidate): StatusReason {
  return {
    announcementId: c.announcement.id,
    title: c.announcement.title,
    type: c.announcement.type,
  };
}

function disruptedExplanation(count: number): string {
  return (
    `${count} active announcement${count === 1 ? "" : "s"} ` +
    `${count === 1 ? "reports" : "report"} a cancellation, suspension, or other ` +
    "disruption affecting this route on the travel date. " +
    "Check the announcement details before you travel."
  );
}

function monitorExplanation(total: number, unofficial: number): string {
  // Every announcement behind this MONITOR is from an unofficial source.
  if (unofficial === total) {
    const subject =
      total === 1
        ? "1 announcement from an unofficial source may"
        : `${total} announcements from unofficial sources may`;
    return (
      `${subject} affect this route on the travel date. ` +
      "Unofficial reports are unconfirmed; check the official sources before you travel."
    );
  }

  const base =
    `${total} active announcement${total === 1 ? "" : "s"} ` +
    `${total === 1 ? "applies" : "apply"} to this route on the travel date ` +
    "and may affect travel.";
  const note =
    unofficial > 0
      ? ` ${unofficial} of them ${unofficial === 1 ? "is" : "are"} from an ` +
        `unofficial source${unofficial === 1 ? "" : "s"}.`
      : "";
  return `${base}${note} Keep an eye on updates before you travel.`;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function getTripStatus(
  trip: StatusTrip,
  announcements: readonly StatusAnnouncement[],
  now: Date | string,
  options: StatusOptions = {},
): TripStatusResult {
  const policy = options.unofficialSourcePolicy ?? DEFAULT_UNOFFICIAL_SOURCE_POLICY;

  const nowMs = typeof now === "string" ? Date.parse(now) : now.getTime();
  if (Number.isNaN(nowMs)) {
    throw new RangeError("getTripStatus: 'now' is not a valid date.");
  }
  const computedAt = new Date(nowMs).toISOString();

  const build = (
    status: TripStatus,
    reasons: StatusReason[],
    explanation: string,
  ): TripStatusResult => ({ status, reasons, explanation, computedAt });

  // --- Travel day boundaries in Manila time (fixed UTC+8, no DST) ----------
  const dayStartMs = parseTravelDayStart(trip.travelDate);
  if (dayStartMs === null) {
    return build(
      "UNKNOWN",
      [],
      "The trip date is not valid, so PortWatch cannot show a status.",
    );
  }
  const dayEndMs = dayStartMs + MS_PER_DAY;

  const todayStartMs = parseTravelDayStart(manilaDateString(nowMs));
  if (todayStartMs === null) {
    // Cannot happen for a valid `now`, but keeps the types honest.
    throw new RangeError("getTripStatus: could not work out today's date.");
  }
  const daysAhead = Math.round((dayStartMs - todayStartMs) / MS_PER_DAY);

  // --- Extra rule: travel day already passed -> UNKNOWN ---------------------
  if (daysAhead < 0) {
    return build("UNKNOWN", [], "This trip date has passed.");
  }

  // --- Sort announcements into buckets (inputs are only read, never changed) -
  const disrupting: Candidate[] = [];
  const monitoring: Candidate[] = [];
  const freshForRoute: Candidate[] = [];

  for (const announcement of announcements) {
    // Source rule 1: announcements from inactive sources are ignored entirely.
    if (!announcement.sourceIsActive) continue;

    // Relevant #1: status is active.
    if (announcement.status !== "ACTIVE") continue;

    // Source rule 2: unofficial sources under policy A are ignored entirely
    // (they never raise status and never count for freshness).
    const unofficial = !announcement.sourceIsOfficial;
    if (unofficial && policy === "IGNORE") continue;

    // Relevant #3 (also needed for freshness): applies to the trip's route.
    if (!appliesToRoute(announcement, trip.routeId)) continue;

    // Relevant #2: published_at is not in the future.
    const publishedMs = parseTime(announcement.publishedAt);
    if (publishedMs === null || publishedMs > nowMs) continue;

    const candidate: Candidate = { announcement, publishedMs, unofficial };

    // Rule 3 input: an active OFFICIAL announcement for this route, any type,
    // published within the last UPDATE_FRESHNESS_HOURS. (Unofficial ones never
    // count for freshness, even under policy B.)
    if (!unofficial && nowMs - publishedMs <= UPDATE_FRESHNESS_HOURS * MS_PER_HOUR) {
      freshForRoute.push(candidate);
    }

    // Relevant #4: effective window overlaps the travel day.
    if (!overlapsTravelDay(announcement, publishedMs, dayStartMs, dayEndMs)) {
      continue;
    }

    // Level from type + impact (escalate only). Under policy B, an unofficial
    // announcement is capped at MONITOR.
    let level = raisedLevel(announcement);
    if (unofficial && level === "DISRUPTED") level = "MONITOR";

    if (level === "DISRUPTED") {
      disrupting.push(candidate);
    } else if (level === "MONITOR") {
      monitoring.push(candidate);
    }
    // level NONE (e.g. General Information, impact NONE) never raises status.
  }

  // --- Rule 1: relevant DISRUPTED-level announcement -> DISRUPTED -----------
  if (disrupting.length > 0) {
    disrupting.sort(newestFirst);
    return build(
      "DISRUPTED",
      disrupting.map(toReason),
      disruptedExplanation(disrupting.length),
    );
  }

  // --- Rule 2: relevant MONITOR-level announcement -> MONITOR ---------------
  if (monitoring.length > 0) {
    monitoring.sort(newestFirst);
    const unofficialCount = monitoring.filter((c) => c.unofficial).length;
    return build(
      "MONITOR",
      monitoring.map(toReason),
      monitorExplanation(monitoring.length, unofficialCount),
    );
  }

  // --- Rule 3: within horizon AND a fresh route update -> NORMAL ------------
  const withinHorizon = daysAhead <= TRAVEL_HORIZON_DAYS;
  if (withinHorizon && freshForRoute.length > 0) {
    freshForRoute.sort(newestFirst);
    const latest = freshForRoute[0];
    return build(
      "NORMAL",
      [toReason(latest)],
      `No known disruption recorded as of ${formatManilaDate(latest.publishedMs)}. ` +
        `Latest update: ${latest.announcement.title}.`,
    );
  }

  // --- Rule 4: otherwise UNKNOWN ---------------------------------------------
  if (!withinHorizon) {
    return build(
      "UNKNOWN",
      [],
      `This trip is more than ${TRAVEL_HORIZON_DAYS} days away, ` +
        "so there is not enough information yet.",
    );
  }
  return build(
    "UNKNOWN",
    [],
    `No update recorded in the last ${UPDATE_FRESHNESS_HOURS} hours.`,
  );
}