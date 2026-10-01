# PortWatch: UI/UX Design Brief

For use by Antigravity (and anyone doing visual work) starting in Phase 5. Save as `docs/DESIGN_BRIEF.md`.

---

## 1. Tone

**Clean & official — a trust feel, like a well-run civic-tech site**, not a startup or a mascot-driven consumer app. Think: a properly modern government advisory page (PAGASA weather bulletins, a well-designed LTO or DOTr portal), not a travel-booking app. The product tells people something important and doesn't need to sell them anything, so the design shouldn't try to sell either.

**In practice:** generous whitespace, clear hierarchy, calm color use, no gradients/neon/playful illustration, no stock travel photography. Confidence comes from clarity and restraint, not decoration.

## 2. Color

- **Primary:** a deep navy or teal (e.g. `#0B3D5C` / `#0F4C5C` range) — authoritative, calm, reads as "official" without being cold like pure black-and-white.
- **Neutral base:** white / very light gray backgrounds (`#F8FAFC`-ish), dark gray text (`#1F2937`-ish), not pure black.
- **Status colors (fixed, do not deviate):**
  - NORMAL → green
  - MONITOR → amber/yellow
  - DISRUPTED → red
  - UNKNOWN → gray
- **Rule:** status color is always paired with its text label. Never color-only. This matters doubly here — some users may have color vision differences, and this is safety-relevant information.
- Avoid purple/violet as a primary — reads as consumer-startup, works against the "official" tone.

## 3. Typography

- A clean, humanist sans-serif. **Inter** or **Public Sans** (the same family many government digital services use) for body and UI text.
- Headings: same family, heavier weight — don't introduce a second display font. One family, few weights, used consistently, reinforces the "official" restraint.
- Body text sizing: err slightly larger than a typical consumer app default (16px minimum for body), since some users may be older or reading on a smaller/older phone screen.

## 4. Layout & components

**Navigation: left sidebar, not a top nav bar.** Decided after reviewing a reference (a SaaS admin-dashboard style: white sidebar panel, icon + label nav rows, active-item highlight, collapses to icon-only on narrow widths). PortWatch's site is flatter than that reference — no nested sections like "Reports > Enrollment" — so the sidebar should borrow the *visual pattern* (white/light panel, generous row spacing, small accent highlight on the active item) without inventing groupings that don't exist. Flat list of links only:
- Home (dashboard)
- Announcements
- Routes
- My Trips (visible when signed in)
- Admin (visible only to admins — links into the existing `/admin` section, doesn't replace it)
- Login/Sign out at the bottom

**Responsive behavior:** collapse to icon-only (or an off-canvas drawer opened by a hamburger button) below the tablet breakpoint — don't just shrink a full-width sidebar on mobile, that wastes screen space on a phone. This replaces the current top-nav `Header` component entirely.

**Accent color use, corrected:** the reference's own accent is used *sparingly* — a small logo mark, an active-row highlight bar, a stat number — never as a large background fill. Apply the same restraint with **navy/teal** (Section 2's color, unchanged — do not switch to purple). If an earlier pass felt "boring blue," that's very likely this restraint being missing (blue used as flooded background), not the color choice itself.

- **Card-based** for announcements and routes — a bordered or subtly-shadowed block per item, not a dense table-like list, except in admin (admin can stay denser/table-based, since that's Claude's domain, not Antigravity's).
- Consistent spacing scale (Tailwind defaults are fine — stick to a small set like `4, 6, 8, 12, 16` rather than arbitrary values).
- Buttons: solid primary color for the main action, outlined/ghost for secondary — avoid more than one visual "shout" per screen.
- Icons: simple line icons only (e.g. Lucide, already available in this project's tooling) — no cartoon/mascot-style icons. A subtle boat/anchor/wave motif is fine as an accent (e.g. a small icon in the sidebar header), but keep it restrained, not decorative.

## 5. Imagery

No stock photography, no hero images required. This is an information tool, not a marketing site — a photo of a ferry doesn't help someone decide whether to travel. If imagery is wanted later, prefer a single, real, specific photo of Pilar Port itself over generic stock. For v0.1, icons and typography alone are enough.

## 6. Language: English only (v0.1)

**Decided:** English only for now — bilingual UI isn't a priority yet. All UI chrome (navigation, buttons, status labels, disclaimer, empty states) and announcement content stay in English, with no language-switcher and no translation logic to build. This keeps the interface simpler and avoids engineering effort on something not yet needed.

A Filipino/Tagalog (or Bicol) version is a reasonable idea to revisit later, once there's real evidence it's needed — but it's explicitly out of scope for v0.1. If it comes back into scope, revisit this section before building it, since the earlier draft had a two-tier plan (bilingual UI chrome now, no content translation) worth referencing at that point.

## 7. Device assumption

Mixed mobile and desktop, generally decent connections — so no need for extreme low-bandwidth optimization (small SVG icons and system fonts are still fine defaults, but there's no hard requirement to avoid all images or minimize every asset). Still mobile-first in layout (per the existing Phase 5 rule: test at 375px, 768px, 1280px) since a meaningful share of travelers will check this on a phone before a trip, but the design doesn't need to assume a 2G connection.

## 8. Accessibility

- Minimum contrast: body text should clear WCAG AA against its background (roughly 4.5:1). This matters more than usual here, since the whole point of the status colors is being read correctly, possibly quickly, possibly outdoors on a phone screen.
- Tap targets on mobile: at least 44×44px for buttons/links, given some users may be less precise on a touchscreen.
- Every status indicator: color + icon/shape + text label, never color alone (already a hard rule from earlier phases — restating here since it's now also a design brief item, not just a data-safety one).

## 9. What to avoid

- Mascots, cartoon illustrations, playful micro-animations
- Gradients, neon accents, "app-store" visual trends
- Dense, cluttered tables on public-facing pages (fine on admin pages, not here)
- Marketing language in copy ("Never miss a trip again!") — stick to plain, factual wording, matching the product's own principle: informs, doesn't sell, doesn't promise.

---

**For Antigravity:** update the Phase 5 `GEMINI.md` to reference this file directly, e.g. add the line: *"Follow docs/DESIGN_BRIEF.md for tone, color, typography, and bilingual UI text — this takes precedence over generic Tailwind defaults."*