# Architecture Reference

This is a living reference describing the database schema and key architectural
decisions for this project. Point future chats/sessions here instead of
re-deriving schema facts from scratch. Update this file whenever the schema or
a key decision changes.

---

## Table Reference

### `ports`
Master list of ferry/shipping ports.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | — | Must not be blank (`ports_name_not_blank`) |
| `location` | text | Yes | — | Free-text location |
| `description` | text | Yes | — | |
| `active` | boolean | No | `true` | Whether the port is currently in use |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**Constraints:**
- `ports_name_not_blank`: `name` cannot be empty/whitespace-only.

**Indexes:**
- `ports_name_location_key` (**unique**): on `(lower(name), coalesce(lower(location), ''))`. Prevents two ports with the same name at the same location, case-insensitively (a null `location` is treated as `''` for this comparison).

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.

---

### `routes`
A directed route between two ports (e.g. Port A → Port B).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `origin_port_id` | uuid | No | — | FK → `ports.id` |
| `destination_port_id` | uuid | No | — | FK → `ports.id` |
| `name` | text | No | — | Must not be blank |
| `active` | boolean | No | `true` | |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**Constraints:**
- `routes_origin_port_id_fkey` / `routes_destination_port_id_fkey`: both FKs are `ON DELETE RESTRICT` — a port can't be deleted while routes reference it.
- `routes_ports_differ`: origin and destination must be different ports (no self-routes).
- `routes_origin_destination_key`: `(origin_port_id, destination_port_id)` is unique — only one route per origin/destination pair. Note this means routes are directional; A→B and B→A are two distinct rows if both exist.
- `routes_name_not_blank`: `name` cannot be empty/whitespace-only.

**Indexes:**
- `routes_origin_destination_key` (the unique constraint above) already covers `origin_port_id` lookups.
- `routes_destination_port_id_idx`: plain index on `destination_port_id`, for the reverse lookup (routes arriving at a given port).

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.

---

### `sources`
An information source that announcements are attributed to (e.g. a port authority website, a news outlet).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | — | Must not be blank |
| `source_type` | text | No | — | Must not be blank (free-text category, not an enum) |
| `url` | text | No | — | Must be a valid `http(s)://` URL |
| `official` | boolean | No | `false` | Whether this is an official/authoritative source |
| `active` | boolean | No | `true` | `false` = archived |
| `last_checked_at` | timestamptz | Yes | — | "Checked, nothing new" marker — when the source was last polled/reviewed |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**Constraints:**
- `sources_name_not_blank`, `sources_type_not_blank`: neither field may be blank.
- `sources_url_http`: `url` must match `^https?://\S+$`.

**Indexes:**
- `sources_url_key` (**unique**): on `lower(url)`. Prevents duplicate sources pointing at the same URL, case-insensitively.

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.

---

### `announcements`
A single announcement/update (e.g. a schedule disruption, delay, or advisory) originating from a source, optionally scoped to one or more routes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `source_id` | uuid | No | — | FK → `sources.id` |
| `title` | text | No | — | Must not be blank |
| `description` | text | Yes | — | |
| `type` | enum `announcement_type` | No | — | See values below |
| `status` | enum `announcement_status` | No | `'ACTIVE'` | See [docs/STATUS_RULES.md](./STATUS_RULES.md) for the full state machine and rules |
| `impact` | enum `announcement_impact` | No | `'NONE'` | Values: `NONE`, `MONITOR`, `DISRUPTED` — travel impact this announcement implies, feeding derived route/trip status |
| `published_at` | timestamptz | No | — | When the announcement was published by the source |
| `effective_from` | timestamptz | Yes | — | Start of the period the announcement applies to |
| `effective_until` | timestamptz | Yes | — | End of that period |
| `source_url` | text | No | — | **Required** — direct link to the original announcement (see Key Decisions) |
| `applies_to_all_routes` | boolean | No | `false` | If true, applies globally rather than to specific routes via `announcement_routes` |
| `resolved_at` | timestamptz | Yes | — | Set when the announcement is resolved (see Key Decisions) |
| `resolved_by_announcement_id` | uuid | Yes | — | FK → another `announcements.id` that resolved/superseded this one |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**`announcement_type` enum values:**
`Cancellation`, `Suspension`, `Schedule Change`, `Weather Advisory`, `Port Advisory`, `Safety Advisory`, `General Information`

**Constraints:**
- `announcements_source_id_fkey`: `ON DELETE RESTRICT` — a source can't be deleted while it has announcements.
- `announcements_source_url_http`: `source_url` must be a valid `http(s)://` URL.
- `announcements_title_not_blank`: `title` cannot be blank.
- `announcements_effective_range_valid`: if both `effective_from` and `effective_until` are set, `effective_until >= effective_from`.
- `announcements_not_self_resolved`: an announcement cannot resolve itself (`resolved_by_announcement_id <> id`).
- `announcements_resolved_by_announcement_id_fkey`: `ON DELETE RESTRICT` — the resolving announcement can't be deleted while referenced.
- `announcements_resolved_by_needs_resolved_at`: if `resolved_by_announcement_id` is set, `resolved_at` must also be set.
- `announcements_resolution_consistent`: enforces that `status` and `resolved_at` agree:
  - `status = 'RESOLVED'` requires `resolved_at IS NOT NULL`
  - `status = 'ACTIVE'` requires `resolved_at IS NULL`
  - `status = 'WITHDRAWN'` has no constraint on `resolved_at`

  Full lifecycle/status rules: **see [docs/STATUS_RULES.md](./STATUS_RULES.md)**.

**Indexes:**
- `announcements_published_at_idx`: on `published_at desc` — speeds "most recent announcements" queries.
- `announcements_source_id_published_at_idx`: composite `(source_id, published_at desc)` — speeds "most recent announcements from this source" queries.
- `announcements_active_effective_idx`: partial index on `(effective_from, effective_until)` **where `status = 'ACTIVE'`** — speeds queries for currently-active announcements within a given effective date range.
- `announcements_resolved_by_idx`: partial index on `resolved_by_announcement_id` **where not null** — speeds "what did this announcement resolve" lookups.

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.

---

### `announcement_routes`
Join table linking announcements to the specific routes they apply to (used when `applies_to_all_routes = false`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `announcement_id` | uuid | No | — | FK → `announcements.id` |
| `route_id` | uuid | No | — | FK → `routes.id` |
| `created_at` | timestamptz | No | `now()` | |

**Constraints:**
- `announcement_routes_pkey`: `PRIMARY KEY (announcement_id, route_id)` — this composite key already prevents duplicate `(announcement_id, route_id)` pairs at the database level.
- `announcement_routes_announcement_id_fkey`: `ON DELETE CASCADE` — deleting an announcement removes its route links.
- `announcement_routes_route_id_fkey`: `ON DELETE RESTRICT` — a route can't be deleted while an announcement is linked to it.

**Indexes:**
- `announcement_routes_route_id_idx`: on `(route_id, announcement_id)` — speeds "which announcements apply to this route" lookups. (The primary key already indexes `(announcement_id, route_id)` for the reverse direction.)

**Triggers:** none. Pure link rows — no `updated_at` column, so no `set_updated_at` trigger.

---

### `profiles`
Application-level user profile, one-to-one with Supabase Auth users.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | — | Primary key, also FK → `auth.users.id` |
| `role` | enum `profile_role` | No | `'user'` | Values: `user`, `admin` |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**Constraints:**
- `profiles_id_fkey`: `ON DELETE CASCADE` — deleting the auth user deletes the profile.

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.
- `prevent_role_change` (before update of `role`): blocks any change to `role` when the request comes from a signed-in API caller — see the RLS section below for details.

---

### `trips`
A user's planned trip along a route.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | — | FK → `profiles.id` |
| `route_id` | uuid | No | — | FK → `routes.id` |
| `travel_date` | date | No | — | |
| `planned_departure` | time (no tz) | Yes | — | Local Asia/Manila wall-clock time — see timezone note in Key Decisions |
| `notes` | text | Yes | — | Max 1000 characters |
| `created_at` | timestamptz | No | `now()` | |
| `updated_at` | timestamptz | No | `now()` | |

**Constraints:**
- `trips_user_id_fkey`: `ON DELETE CASCADE` — deleting a user's profile deletes their trips.
- `trips_route_id_fkey`: `ON DELETE RESTRICT` — a route can't be deleted while trips reference it.
- `trips_notes_length`: `notes`, if present, must be ≤ 1000 characters.

**Indexes:**
- `trips_user_id_travel_date_idx`: on `(user_id, travel_date desc)` — speeds "my upcoming/past trips" queries.
- `trips_route_id_travel_date_idx`: on `(route_id, travel_date)` — speeds "trips on this route" queries.

**Triggers:**
- `set_updated_at` (before update): stamps `updated_at = now()` on every update.

---

## Cross-cutting triggers (not tied to a single application table)

- **`handle_new_user()`** — `AFTER INSERT on auth.users`, `SECURITY DEFINER`. On
  every new Supabase Auth signup, inserts a matching `public.profiles` row
  with `role = 'user'` (`on conflict (id) do nothing`, so it's safe to re-run).
  A one-time backfill statement in migration 1 also created profiles for any
  auth users that already existed before this migration ran.

---

## Row-Level Security (RLS) Policies

RLS is **enabled on every table** (`profiles`, `ports`, `routes`, `sources`,
`announcements`, `announcement_routes`, `trips`). Source: migration 2.

### `is_admin()` — the admin check used throughout
A `SECURITY DEFINER` SQL function:

```sql
select exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin'
);
```

Because it's `SECURITY DEFINER` with `search_path = ''`, it can read
`profiles` without going through `profiles`'s own RLS policies (which would
otherwise recurse). Only the `authenticated` role can execute it — `anon` and
`public` have `EXECUTE` revoked, so anonymous requests never touch it.
Nearly every admin-gated policy below is just `using`/`with check
((select public.is_admin()))`.

### `profiles`
- **SELECT (own):** `authenticated` — a user can read their own row (`id = auth.uid()`).
- **SELECT (admin):** `authenticated` — an admin can read every row (`is_admin()`).
- **No INSERT/UPDATE/DELETE policies.** Rows are created automatically by the
  `handle_new_user()` trigger on `auth.users` signup, and roles are changed
  manually in the database (`update public.profiles set role = 'admin' ...`),
  not through the API.
- **Extra guard — `prevent_role_change` trigger:** even if an UPDATE policy is
  added later for other profile columns, this `BEFORE UPDATE OF role` trigger
  blocks any change to `role` whenever the request comes from a signed-in API
  caller (`auth.uid() is not null`). Role changes only succeed from the SQL
  editor / service role, where `auth.uid()` is null.

### `ports`
- **SELECT:** `anon, authenticated` — world-readable (`using (true)`).
- **INSERT / UPDATE / DELETE:** `authenticated` only, gated by `is_admin()` on both `using` and `with check` (for update).

### `routes`
Same shape as `ports`:
- **SELECT:** `anon, authenticated` — world-readable.
- **INSERT / UPDATE / DELETE:** admin-only (`is_admin()`).

### `sources`
Same shape again:
- **SELECT:** `anon, authenticated` — world-readable.
- **INSERT / UPDATE / DELETE:** admin-only (`is_admin()`).

### `announcements`
- **SELECT (public):** `anon, authenticated` — can see rows where `status = 'ACTIVE'` only.
- **SELECT (admin):** `authenticated` — admins can see *all* rows regardless of status (`is_admin()`).
  Since Postgres OR's together multiple permissive `SELECT` policies for the
  same role/command, an authenticated admin effectively gets the union of
  both — they are not restricted to ACTIVE-only.
- **INSERT / UPDATE / DELETE:** admin-only (`is_admin()`).

  Net effect: `RESOLVED` and `WITHDRAWN` announcements are invisible to
  regular users/anon and only visible to admins.

### `announcement_routes`
- **SELECT:** `anon, authenticated` — world-readable (`using (true)`), regardless of the linked announcement's status. (Worth noting: a non-admin could see that some route is linked to *an* announcement even if that announcement itself isn't visible to them via `announcements`' status-gated SELECT policy, since there's no join-based check here.)

  > **Accepted for v0.1** — SELECT is unrestricted regardless of the linked
  > announcement's status, so a non-admin could see that a route has some
  > announcement attached even when it's `RESOLVED`/`WITHDRAWN` and hidden
  > elsewhere. No title/description/content is exposed, only the existence
  > of a row. Low risk, not fixed — would need a join-aware policy checking
  > `announcements.status` if this becomes a concern later.

- **INSERT / UPDATE / DELETE:** admin-only (`is_admin()`).

### `trips`
- **SELECT / INSERT / UPDATE / DELETE:** `authenticated` only, and always scoped
  to `user_id = auth.uid()` (both `using` and `with check` where applicable).
  **Admins get no special access to `trips`** — there's no `is_admin()` policy
  here at all. Trip data is private to the owning user, full stop.

### Summary table

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | own row, or admin (all) | — (trigger-only) | — (manual only, plus `prevent_role_change` guard) | — |
| `ports` | everyone | admin | admin | admin |
| `routes` | everyone | admin | admin | admin |
| `sources` | everyone | admin | admin | admin |
| `announcements` | everyone (ACTIVE only), or admin (all) | admin | admin | admin |
| `announcement_routes` | everyone | admin | admin | admin |
| `trips` | owner only | owner only | owner only | owner only |

---

## Announcement Status Rules

The `announcements.status` enum, its allowed transitions, and the full
lifecycle rules (including how `resolved_at` and `resolved_by_announcement_id`
interact with status) are documented separately in
**[docs/STATUS_RULES.md](./STATUS_RULES.md)**. Refer there rather than
duplicating the rules here — this file only lists the raw DB-level check
constraint (`announcements_resolution_consistent`) for reference under the
`announcements` table above.

---

## Tech Stack & Key Decisions

**Stack:**
- PostgreSQL, hosted via Supabase (evidenced by `profiles.id` referencing `auth.users(id)`)
- UUID primary keys throughout (`gen_random_uuid()`)
- Enum types for `announcements.type` (`announcement_type`), `announcements.status` (`announcement_status`), `announcements.impact` (`announcement_impact`), and `profiles.role` (`profile_role`)

**Key decisions:**

1. **`source_url` is required, not optional.**
   Every announcement must carry a direct, validated (`http(s)://`) link back
   to its original source (`announcements.source_url_http`, `NOT NULL`). This
   is intentional — announcements should always be traceable to their origin
   rather than existing as free-standing text.

2. **`resolved_at` behavior.**
   `resolved_at` is the single source of truth for "when was this resolved,"
   and it's kept consistent with `status` at the DB level:
   - `status = 'ACTIVE'` ⇒ `resolved_at` must be `NULL`.
   - `status = 'RESOLVED'` ⇒ `resolved_at` must be set.
   - `status = 'WITHDRAWN'` ⇒ `resolved_at` is unconstrained (can be null or set).
   - If `resolved_by_announcement_id` is set (i.e. another announcement superseded/resolved this one), `resolved_at` must also be set — you can't point to a resolving announcement without recording when resolution happened.
   - See `docs/STATUS_RULES.md` for the full lifecycle this supports.

3. **Timezone = Asia/Manila.**
   The application's canonical timezone for interpreting and displaying
   date/time data is **Asia/Manila**. Note that most timestamp columns are
   stored as `timestamptz` (timezone-aware, normalized to UTC internally by
   Postgres), except `trips.planned_departure`, which is a plain `time without
   time zone` — when reading/writing this column, the app layer is
   responsible for treating it as Asia/Manila local time rather than relying
   on the database to do timezone conversion.

4. **Roles are admin-managed, not self-service.**
   `profiles.role` only has two values (`user`, `admin`), new users always
   start as `user` via the `handle_new_user()` trigger, and role escalation is
   deliberately kept out of the API surface — it's a manual SQL statement plus
   a DB trigger (`prevent_role_change`) that rejects any API-driven attempt to
   change it.

---

*Last generated from a schema/constraint export plus migrations 1 (schema) and
2 (RLS). Keep this file in sync with actual migrations — if you add/alter
tables, columns, constraints, indexes, triggers, or policies, update the
corresponding section above.*