# PortWatch Travel Status Rules (v0.1)

Statuses: NORMAL, MONITOR, DISRUPTED, UNKNOWN. PortWatch informs; it never says a vessel "will sail".

## A "relevant" announcement must ALL be true
1. status is active
2. published_at is not in the future
3. it applies to the trip's route (listed for that route, or applies to all routes)
4. its effective window overlaps the trip's travel day, in Asia/Manila time
   (effective_from empty = start at published_at; effective_until empty = no end)

## Result (first match wins)
1. Relevant Cancellation or Suspension -> DISRUPTED
2. Relevant Weather Advisory, Port Advisory, Safety Advisory, or Schedule Change -> MONITOR
3. Travel day is today through 7 days from today (TRAVEL_HORIZON_DAYS = 7) AND some active
   announcement for this route (any type, including General Information) was published within
   the last 48 hours (UPDATE_FRESHNESS_HOURS = 48) -> NORMAL
   ("no known disruption as of the latest update")
4. Otherwise -> UNKNOWN

## Extra rules
- Travel day already passed -> UNKNOWN, with the explanation "This trip date has passed."
- Every result includes reasons (announcement id, title, type) and a plain-English explanation.
- Explanations never promise a sailing. Use wording like "No known disruption recorded as of <date>."
- Two constants, easy to change: TRAVEL_HORIZON_DAYS = 7 (how far ahead we can say anything)
  and UPDATE_FRESHNESS_HOURS = 48 (how recent the latest update must be for NORMAL).
- Time zone: Asia/Manila (UTC+8, no daylight saving). Trip dates are calendar dates.
- Admin tip: post a "General Information" announcement for all routes ("No known disruptions as of <date>")
  as a daily check-in (at least every 48 hours) so routes don't fall back to UNKNOWN.
- Future automation: automated checks should be recorded (e.g. a last_checked_at value) and automated items should arrive as drafts for admin review, never published automatically.
- Impact can escalate status but never downgrade it.
- Source rules (inactive sources ignored; unofficial sources: [A or B]) are applied inside the status function.
- Admin form rules (Phase 4): "until" dates save end of day Manila time; every announcement needs at least one route or "all routes".