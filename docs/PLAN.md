# Architecture & Roadmap

**Mission:** remove every excuse between a person and a Bible study. Browsing, reading details, and
joining never require an account.

## Stack

| Layer    | Choice                                          | Why |
| -------- | ----------------------------------------------- | --- |
| Web app  | Next.js 16 (App Router, Server Actions), React 19 | Server-rendered pages load fast and index well (people search "bible study near me"); Server Actions give a no-API join flow. |
| Styling  | Tailwind CSS v4 + lucide-react                  | Design tokens in `app/globals.css`, automatic dark mode. shadcn/ui can be layered in when admin forms need dialogs and selects. |
| Data     | Supabase (Postgres + RLS + magic-link Auth)     | Row-level and column-level security let the anon key read the directory safely; magic links cover leader auth with zero passwords. |
| Mobile   | PWA now, then **Capacitor** shell               | See below. |

### Why Next.js + Capacitor rather than Expo

- The product is mostly *content + one form*. That is the web's strength, and SEO matters for discovery.
  Expo Router's web output is weaker for SSR/SEO.
- Capacitor wraps the deployed site in a native shell (`server.url`). Add native plugins where they
  actually help: push notifications ("your study starts in 1 hour"), share sheet, native calendar
  insert. The same codebase keeps shipping to web, iOS, and Android.
- If a fully native UI is ever needed, `lib/` (types, filters, schedule, calendar) is framework-free
  TypeScript and ports to an Expo app unchanged against the same Supabase backend.

## Data model (`supabase/migrations/20260924000000_init.sql`)

```
leaders ──< study_leaders >── bible_studies ──< study_tags >── tags
                                    │
                                    └──< inquiries
```

- **bible_studies**: title, summary, description, curriculum; schedule as local wall-clock
  (`day_of_week`, `start_time`, `timezone`, `cadence` weekly/biweekly, `anchor_date` for biweekly parity);
  `format`, public `neighborhood`/`location_name`, **private** `address`/`meeting_url`; hospitality
  (`childcare`, `food`, `capacity`); `status` active/paused/archived.
- **leaders**: name, photo, bio, **private** `email` (magic-link login), opt-in `public_phone` + `whatsapp`.
- **tags**: `category` = audience (men, women, college, …) or topic (book study, prayer, …).
- **inquiries**: name + email-or-phone + optional note, `status` new/contacted/joined/declined.

Security:
- Anon can `select` only public columns (column grants). The address and meeting link are never exposed
  in the public API.
- Anon cannot touch `inquiries` directly. They call `submit_inquiry()` (security definer), which
  validates, rate-limits (5/contact/hour), stores the inquiry, and **returns the private address and link**,
  so joining immediately tells you where to go.
- Leaders (authenticated) can edit only studies they're linked to via `study_leaders`, and read only those
  studies' inquiries. `is_admin` leaders can edit everything.

## Folder structure

```
proxy.ts                           Session refresh + sign-in guard for /leader/*
app/
  page.tsx                         Directory (server: fetch + parse URL filters)
  auth/confirm/route.ts            Magic-link landing
  leader/login/                    Sign-in page + actions
  leader/(app)/                    Dashboard, studies editor, people, profile, welcome, admin
  studies/[slug]/page.tsx          Detail: what to expect, hosts, next meeting, join
  studies/[slug]/join-form.tsx     Name + email-or-phone, useActionState
  studies/[slug]/actions.ts        joinStudy Server Action
  studies/[slug]/calendar.ics/     Recurring .ics (Apple / Outlook)
components/
  directory/                       Directory (client filter state), FilterBar, StudyCard
  ui/                              Chip, Avatar
lib/
  data/studies.ts                  Public queries (+ seed fallback)
  leader/                          Leader queries + study form schema
  supabase/                        public (anon), server (cookies), env
  auth.ts                          getSession / requireLeader / requireAdmin
  data/seed-data.ts                Sample content (source for supabase/seed.sql)
  filters.ts  schedule.ts  calendar.ts  types.ts
supabase/
  migrations/  seed.sql
scripts/generate-seed-sql.mts
```

## Roadmap

**Phase 1: Directory ✅**
Schema + RLS, seed data, layout and design tokens, URL-synced filters (day, time, audience, focus, format,
area, text search), soonest-first cards, detail page, one-step join, Google/ICS calendar, text/WhatsApp links.

**Phase 2: Leaders ✅ (core)**
- Magic-link sign-in (`/leader/login` → `/auth/confirm`), `proxy.ts` session refresh + guard on `/leader/*`.
- Self-serve onboarding: sign in → create profile → list studies. New leaders stay hidden until an
  admin approves them (`/leader/admin`), which keeps spam out of the directory.
- Dashboard: my studies with Live / Paused / Awaiting approval, pause/resume, edit, delete.
- Study editor: the next meeting date sets the weekday and biweekly rhythm; private address/link.
- People inbox: everyone who tapped "Count me in", one-tap email/text/call, status tracking.
- Private details moved to `study_private` so signed-in users can't read other studies' addresses.

**Phase 2b: Leader follow-ups**
- Email/SMS to the leader on each inquiry (Edge Function + Resend/Twilio). Needs custom SMTP anyway,
  since Supabase's built-in email only reaches project team members.
- Realtime "new person" badge; photo upload to Supabase Storage; co-leader invites.

**Phase 3: Reach**
- PWA manifest + offline shell; "near me" sort (store lat/lng, PostGIS `earth_distance`).
- Open Graph images per study for sharing; JSON-LD `Event` markup.
- Admin view: approve new leaders, org-wide stats.
- Capacitor iOS/Android shells, push reminders before each meeting.

**Phase 4: Care**
- Automatic "we'd love to see you this week" follow-up to new inquiries.
- Seasonal studies (start/end dates), holiday skips, capacity waitlists.
