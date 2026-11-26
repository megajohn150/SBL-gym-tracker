<div align="center">

# SBL Tracker

### A gym tracker with a social side, built as a single-file PWA

<p>
  <img src="https://img.shields.io/badge/JavaScript-ES5-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript ES5">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css&logoColor=white" alt="CSS">
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA">
</p>
<p>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages">
  <img src="https://img.shields.io/badge/platform-iOS_home_screen-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Platform: iOS home screen">
</p>
<p>
  <img src="https://img.shields.io/badge/framework-none-555555?style=for-the-badge" alt="No framework">
  <img src="https://img.shields.io/badge/build_step-none-555555?style=for-the-badge" alt="No build step">
  <img src="https://img.shields.io/badge/tests-Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Tests in Node.js">
</p>

> Log the set. Beat last week. See who else is training right now.

</div>

---

## Overview

A gym tracker I built for myself that grew into a small social app for me and a few friends.
It runs as a PWA installed on the iPhone home screen, works offline and syncs through Supabase.

The whole app is **one HTML file of plain JavaScript**, around 16,000 lines. There is no
framework, no bundler and no build step: saving the file is the build, and `git push` is the
deploy.

## Features

### Logging a workout
- Live session screen with its own number pad, rest timer and a running total of time, volume and sets
- Personal records detected as you go: heaviest weight, estimated 1RM, best set, volume
- Routines you can reorder by dragging, with a time estimate taken from your recent runs
- A weekly plan that puts a routine on each day
- Exercise history with charts, left/right balance for per-side exercises and optional photos kept on the device
- Starter packs of exercises and an importer for Hevy exports

### Seeing progress
- Weekly set count per muscle against your own targets, with a grid showing which weeks you hit them
- Body map, muscle radar, stalled lifts, injuries and a readiness view
- Weekly recap and monthly report, both shareable as an image
- Calendar of every workout

### With friends
- Profiles, follows, a feed of friends' workouts, likes and comments
- Leaderboards and a side-by-side comparison on shared exercises
- Watch a friend's workout live and send quick reactions while they train
- Copy or follow a friend's routine so it stays in sync with theirs
- Web push notifications for likes, comments, follows and the weekly recap

### Everything else
- Offline-first: every change is saved on the device first and synced when there is signal
- Daily local snapshots you can roll back to, plus JSON and CSV export
- Five visual skins with light and dark modes, and an adjustable interface size

## How it is built

| Part | What it uses |
|---|---|
| App | `public/index.html`: markup, CSS and one vanilla JavaScript IIFE |
| Offline and push | `public/sw.js`: service worker for the offline shell and web push |
| Backend | Supabase: Postgres with row level security on every table, Auth, Realtime |
| Notifications | a Supabase Edge Function (`supabase/functions/notify`) fed by database triggers and `pg_cron` jobs |
| Hosting | Cloudflare Pages, serving `public/` as is |
| Fonts | self-hosted, so the app talks to no third party besides Supabase |

The only runtime dependency is `supabase-js`, loaded from a CDN at a pinned version.

## Security

<img src="https://img.shields.io/badge/RLS-every_table-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="RLS: every table"> <img src="https://img.shields.io/badge/secrets_in_repo-none-555555?style=flat-square" alt="secrets in repo: none">

- **Row level security on every table.** Your own workouts, routines and settings are readable and writable only by you.
- **Friends only.** A friend's posts and live session are visible only when you follow each other. Profiles are visible to every signed-in user, so friends can find each other.
- **Friends' data is untrusted input.** Everything that comes from another account is checked and escaped before it is rendered.
- **No secrets in the repo.** The Supabase key in the page is the public `anon` key; the service key and the push secrets live only in Supabase.

## Running it locally

```bash
python3 -m http.server 8765 --directory public
```

Then open http://localhost:8765. The page talks to the Supabase project set in `SB_URL` and
`SB_KEY` in `public/index.html`. To run your own copy:

1. Create a Supabase project.
2. Run `supabase/supabase-social.sql` in its SQL editor (schema, policies, triggers and cron jobs).
3. Deploy `supabase/functions/notify` for push notifications.
4. Put your project's URL and anon key in `SB_URL` and `SB_KEY`.

## Tests

<img src="https://img.shields.io/badge/test_files-38-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white" alt="test files: 38"> <img src="https://img.shields.io/badge/dependencies-0-555555?style=flat-square" alt="dependencies: 0">

```bash
node tests/run.js
```

Plain Node, no dependencies. The suite covers sync and merge conflicts, followed routines,
records and leaderboards, the live workout payload, the feed cache, Hevy import and more.

## Project layout

```
public/index.html          the whole app
public/sw.js               service worker
public/fonts, imgs, logo   self-hosted fonts, sprite sheets, icons
supabase/                  database schema and the notify Edge Function
tests/                     Node test suite
```
