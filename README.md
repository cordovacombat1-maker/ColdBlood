# COLD BLOOD

A phone-first PWA that runs a pro boxer's day: training, weight, schedule, fights, contacts, and a Master Key System mindset routine. Full product spec: [SPEC.md](SPEC.md).

**Status: Phase 1 (core daily use) is built.**

Stack: React + Vite + TypeScript, Tailwind CSS, vite-plugin-pwa, Supabase (auth + Postgres with row-level security), Recharts. Hosted on Netlify.

## What's in Phase 1

| Tab | Screens |
| --- | --- |
| Home | Fight countdown (turns red in fight week), quick-log Weigh-in / Session, weight vs. target with a 14-day sparkline, today's events, streaks (training, Master Key, meditation), today's affirmation |
| Train | Session log (type + minutes + save = 3 taps; sparring detail optional), weekly summary, round timer (bells, 10s warning, screen stays on), schedule (day / week / 30-day list, daily & weekly repeats) |
| Fuel | Weigh-in chart (7/30/90/all) with target line, distance to target, 7-day rate of change, history |
| Mind | Daily checklist, Master Key course (current part, 7-day checklist, sitting timer, notes, jump/restart) and reader (font size, dark/sepia, read-aloud), affirmations (+ read-all mode), journal (searchable) |
| More | Profile (record, units lb/kg, walk-around target), Fights (contract details, fight week checklist, team from contacts, results), Contacts (roles, favorites, call/text/email, search, vCard import) |

Weigh-ins and sessions logged offline are saved on the phone and synced automatically when the connection returns (an amber bar shows the pending count).

## Setup

### 1. Supabase (free tier)

1. Create a project at supabase.com.
2. **SQL Editor** → paste and run `supabase/migrations/20260925000001_init.sql`. It creates every table in the spec's data model, with row-level security on all of them (users only see rows where `user_id = auth.uid()`), and creates a profile automatically on sign-up.
   (Or, with the Supabase CLI: `supabase link` then `supabase db push`.)
3. **Authentication → URL Configuration**: set *Site URL* to your Netlify URL (e.g. `https://cold-blood.netlify.app`) and add it to *Redirect URLs*. This is needed for confirmation emails and email sign-in links.
4. **Project Settings → API**: copy the *Project URL* and the *anon public* key.
5. Optional (admin for future curated videos/lessons): in the SQL editor run `insert into app_admins (user_id) values ('<your auth user id>');`

### 2. Netlify

1. New site → import this GitHub repo. Build settings come from `netlify.toml` (`npm run build`, publish `dist`).
2. **Site configuration → Environment variables**, add:

   | Key | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |

   The anon key is meant to be public; row-level security protects the data. **Never** put the `service_role` key in Netlify or this repo.
3. Deploy. On the phone, open the site and use *Add to Home Screen* (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app).

No paid services are used.

### Local development

```bash
npm install
cp .env.example .env.local   # fill in the two values
npm run dev
```

Checks:

```bash
npm run typecheck
npm test            # unit tests (timer, recurrence, streaks, offline queue, vCard, MK importer…)
npm run db:check    # applies the migration to an in-memory Postgres and verifies RLS isolation
npm run build
```

## Master Key text (action needed)

The app ships with placeholders for the 24 parts of *The Master Key System*. The build environment couldn't reach Project Gutenberg, Internet Archive, or Wikisource, so the text isn't imported yet.

1. Download a plain-text public-domain transcription of Haanel's original (1916/1917) text, such as the Wikisource or Internet Archive scan. Don't use a modern annotated edition.
2. Run `npm run mk:import -- path/to/master-key.txt`. It splits on the `PART ONE` … `PART TWENTY-FOUR` headings, fixes common OCR problems (hyphenation, ligatures, page numbers, wrapped lines), and pulls each week's exercise into the course checklist.
3. Skim `src/content/master-key/part-NN.md` for leftover OCR errors, then commit.

The text is bundled with the app, so it works offline.

## Notes on decisions

- Weights are stored in **pounds** and converted for display when Profile → Units is kg. Default is lb.
- Small additions to the spec's data model: `profiles.walk_around_target`, `events.repeat` (recurrence), `fights.checklist`, `fight_contacts`, `mk_progress.checks`, `mind_sessions.mk_part`, plus tables for phase 2 (`workout_templates`, `saved_meals`, `dream_boards`, `video_progress`, `app_admins`).
- Event reminders are saved now; notifications arrive with Web Push in phase 2.
