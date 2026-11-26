# SBL Tracker

A gym tracker I built for myself that grew into a small social app for me and a few friends.
It runs as a PWA installed on the iPhone home screen, works offline and syncs through Supabase.

The whole app is one HTML file of plain JavaScript. There is no framework, no bundler and no
build step: saving the file is the build, and `git push` is the deploy.

## What it does

**Logging a workout**
- Live session screen with its own number pad, rest timer and a running total of time, volume and sets
- Personal records detected as you go (heaviest weight, estimated 1RM, best set, volume)
- Routines you can reorder by dragging, with a time estimate taken from your recent runs
- A weekly plan that puts a routine on each day
- Exercise history with charts, left/right balance for per-side exercises and optional photos kept on the device
- Starter packs of exercises and an importer for Hevy exports

**Seeing progress**
- Weekly set count per muscle against your own targets, with a grid showing which weeks you hit them
- Body map, muscle radar, stalled lifts, injuries and a readiness view
- Weekly recap and monthly report, both shareable as an image
- Calendar of every workout

**With friends**
- Profiles, follows, a feed of friends' workouts, likes and comments
- Leaderboards and a side-by-side comparison on shared exercises
- Watch a friend's workout live and send quick reactions while they train
- Copy or follow a friend's routine so it stays in sync with theirs
- Web push notifications for likes, comments, follows and the weekly recap

**Everything else**
- Offline-first: every change is saved on the device first and synced when there is signal
- Daily local snapshots you can roll back to, plus JSON and CSV export
- Five visual skins with light and dark modes, and an adjustable interface size

## How it is built

| Part | What it uses |
|---|---|
| App | `public/index.html`: markup, CSS and one vanilla JavaScript IIFE (~16,000 lines) |
| Offline and push | `public/sw.js`: service worker for the offline shell and web push |
| Backend | Supabase: Postgres with row level security on every table, Auth, Realtime |
| Notifications | a Supabase Edge Function (`supabase/functions/notify`) fed by database triggers and `pg_cron` jobs |
| Hosting | Cloudflare Pages, serving `public/` as is |
| Fonts | self-hosted, so the app talks to no third party besides Supabase |

The only runtime dependency is `supabase-js`, loaded from a CDN at a pinned version.

### Security

Every table has row level security. Your own workouts, routines and settings are readable
and writable only by you. A friend's posts and live session are visible only when you follow
each other. Profiles are visible to every signed-in user, so friends can find each other. Data that comes from friends is treated as untrusted input and escaped before it is
rendered. The Supabase key in the page is the public `anon` key; the service key and the push
secrets live only in Supabase.

## Running it locally

```bash
python3 -m http.server 8765 --directory public
```

Then open http://localhost:8765. The page talks to the Supabase project set in `SB_URL` and
`SB_KEY` in `public/index.html`. To run your own copy, create a Supabase project, run
`supabase/supabase-social.sql` in its SQL editor (schema, policies, triggers and cron jobs),
deploy `supabase/functions/notify` for push, and put your project's URL and anon key there.

## Tests

```bash
node tests/run.js
```

Plain Node, no dependencies. The suite covers sync and merge conflicts, followed routines,
records and leaderboards, the live workout payload, the feed cache, Hevy import and more.
