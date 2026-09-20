# PortWatch
Sea-travel info and trip monitoring for Pilar Port, Sorsogon, PH.
It is an information layer: NOT ticketing, NOT sailing prediction.

## Stack
Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS).

## Rules
- Every announcement keeps its source, source_url, and published_at.
- Never claim a trip will sail. Statuses: NORMAL, MONITOR, DISRUPTED, UNKNOWN.
- Every status must show WHY (which announcement caused it).
- All tables have RLS enabled. Never expose the service_role key to the client.
- Schema changes go in supabase/migrations only. No manual dashboard edits.
- TypeScript strict mode. Validate inputs with zod.
- Plan first, then implement. Small commits.

## Ownership
Claude (browser): database, RLS, server logic, types.
Antigravity: UI components, layout, responsive design.