# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A gym tracker PWA, installed to the iOS home screen, hosted on Cloudflare Pages
(`gym-tracker-9hr.pages.dev`) with Supabase behind it. One user plus a handful of friends.

**The entire app is `public/index.html`** — ~10800 lines holding the markup, the CSS and one
IIFE of ES5-style vanilla JavaScript. No build step, no bundler, no `package.json`, no
framework. The only runtime dependency is supabase-js from a CDN, pinned in both the page and
`public/sw.js` (bump both together).

All UI text is English. The user writes and reads Polish — talk to them in Polish, keep the
code and its comments in English.

## Start here, and keep it cheap

This file is the map. It is loaded for free at the start of every session — reading the
source to learn the architecture is paying twice.

- **Never read `public/index.html` whole.** It is ~10800 lines. Grep for the thing
  (`grep -n "function syncFollowed" public/index.html`) and read a window around the hit.
  Function names are unique across the file, so one grep is enough — and see trap 4 before
  you add a name of your own.
- **Jump by section**, see the map below. The banners are stable; the line numbers drift.
- **`node tests/run.js` is the fast feedback loop** — seconds, no tokens, no browser.
  Run it after any change to logic it covers (sync, followed routines, the pull race, records
  and leaderboards, the live-workout payload).
- **Skip the browser unless the change is visual.** When it is needed, the recipe is under
  "Verifying in a browser", and it is Receipt skin + dark mode only.
- **Do not re-derive what is written here.** The data shapes, the ping kinds, the traps and
  the deploy story are all below; they were expensive to learn and are kept current.
- **Ask which area the work is in** if the request is vague. "Routines", "realtime",
  "stats" each map to one section, and that is the difference between reading 60 lines
  and reading 2000.

## Map of `public/index.html`

One IIFE, in this order. Grep the banner name to land in a section; the line numbers are
from version 3.4193 and drift with every edit.

| ~line | section | what is in it |
|---|---|---|
| 2799 | STORE | the store object, `save`/`load`, the `fix*` migrations |
| 2880 | CLOUD | `cloudPull`, `cloudPush`, `mergeStores`, the `rev` lock |
| 3041 | PEOPLE | profiles, follows, the feed, `pushLibrary`; below them, still in this section: the workout-in-progress publisher and viewer (`publishLive`, `loadLive`, `drawLiveView`), a friend's profile (`openUser`), and Compare + leaderboards (`openCompare`, `board`) |
| 3403 | LIVE | the realtime channel, `liveOn`, `liveRun`, `liveData` |
| 4287 | A FOLLOWED ROUTINE | the `follow` block, `applyFollow`, `syncFollowed`, `rtSay` |
| 4646 | NAVIGATION | the screen stack, `render`, `goTab` |
| 4751 | PULL TO START OVER | the refresh gesture and `startOver` |
| 4923 | EXERCISES | the exercise list and form, `saveExercise` |
| 5340 | ROUTINES | the routine editor, `commitRoutine`, the routine list |
| 5797 | one routine over time | the routine view and its charts |
| 6035 | SESSION | the live workout: sets, the number pad, the rest timer |
| 6896 | BACKUP | export and import |
| 7013 | push notifications | subscription handling, the settings row |
| 7139 | Hevy import | reading someone else's export |
| 7466 | likes, comments, the bell | reactions, the offline queue, notifications |
| 8571 | STATISTICS | every chart and the weekly targets |
| 10688 | THEME | skins and light/dark |
| 10772 | BOOT | startup order, the "Version updated" toast, the auth gate, service worker registration |

## Commands

```bash
python3 -m http.server 8765 --directory public   # dev server (no watch, no reload)
node tests/run.js                                # the whole suite
node tests/follow.js                             # one file; each is standalone
```

There is no linter and no formatter. `node --check` on the extracted script is the only
syntax gate; the tests catch the rest. A new test file must also be added to the `files` list
in `tests/run.js`, or the suite never runs it.

On this Mac a bare `head` is the libwww URL tool, not coreutils: use `/usr/bin/head`. `sed -i`
needs the BSD form `sed -i ''`.

A `.git/hooks/pre-commit` hook bumps the patch half of `APP_VERSION` in `public/index.html` on
every commit — never edit that constant by hand. Pushing to `main` deploys; Cloudflare Pages
serves `public/` and nothing is built.

## What lives where

Only the parts that are not self-evident:

| Path | What it is |
|---|---|
| `public/index.html` | the whole app |
| `public/sw.js` | service worker: offline shell, web push, notification clicks |
| `supabase-social.sql` | **source of truth** for the server: tables, RLS, triggers, cron |
| `supabase-realtime-3.sql` | generated from the above; the block the user pastes into the dashboard |
| `supabase/functions/notify/` | Edge Function that turns a trigger into a web push |
| `tests/` | node, no dependencies — see below |
| `others/` | older one-file variants of the app; nothing serves them |
| `*.json` in the root | exported training data (backup / Hevy import), not code |
| `SUPABASE.md`, `TEST-SOCIAL.md` | Polish design and test-plan docs, drifted from the code |
| `WORKING-WITH-CLAUDE.md` | the owner's own Polish note on spending less of the limit; not for you |

## How the tests work

`tests/*.js` have no dependencies and no DOM. They **slice a block of functions out of
`public/index.html` by its first and last line and `eval` it** in a scope that defines the
globals it closes over (`store`, `sb`, `me`, `social`, `byId`, `uid`, `sigOf`, `saveStore`,
the `draw*` functions as no-ops). They therefore test the shipped text, not a copy. If you
rename the function a test slices from, the test fails loudly with "nie ma tego w index.html"
— fix the marker, do not weaken the test.

Stubs resolve through `Promise.resolve().then(...)` so a test can mutate or swap `store`
while a request is "in flight". Every bug these tests were written for was a race of exactly
that shape; keep new tests in that style.

Suites: `follow`, `routines`, `pull` (the three races), `compare` (`myRecords` and the
leaderboard ranking), `live` (the payload a friend gets of your running workout — notes must
not be in it).

## Verifying in a browser

Claude cannot sign in (no password), so anything behind auth is unreachable in the preview.
Two methods, cheapest first:

1. **Seed the store.** Start the dev server, seed `localStorage['tracker-data']` with a store
   object, reload, remove the `#gate` element, then drive the UI from the console. Enough for
   anything that is only local.
2. **A fake Supabase, for anything social** (Compare, leaderboards, live workouts, the feed).
   Copy `public/index.html` to a temporary `public/__t.html` and replace the supabase-js
   `<script src=…>` with an inline fake: `window.supabase.createClient` returning a chainable
   query builder over a plain `window.DB` object (`select/eq/in/gte/order/range`, `upsert`,
   `update`, `delete`, `maybeSingle`, head-count selects), `auth.getSession` returning a user
   `me`, and a `channel()` whose broadcast handler is exposed as `window.__ping(kind)`. Put
   friends, `follows` in both directions, `posts` and `profiles.stats.records` in `DB`, then
   mutate `DB.live_session` and call `__ping('sess')` to play a friend. The preview pane shows
   `file://` pages as static snapshots, so it must be served over http from inside the
   project; delete the copy afterwards. In the fake store `gone` is an **array**.

Check the Receipt skin in dark mode (`tracker-skin=receipt`, `tracker-mode=dark`) and nothing
else unless asked. Clear `localStorage` when done.

Touch gestures can be exercised with synthetic `TouchEvent`s on `document`. Note that
`requestAnimationFrame` does not fire while the preview pane is hidden, so a screenshot (which
forces a frame) is sometimes needed before reading an animated style back.

## Data shapes

`save(k, v)` / `load(k)` prefix every key with `tracker-`. The keys in use: `data` (the
store), `session` (written directly as `tracker-session`), `skin`, `mode`, `xstyle`, `rest`,
`ver` (the last version this device ran, for the "Version updated" toast), `reopen` (the tab
a pull-to-refresh asked for), `uid`, `react-q` (queued likes and comments), `sigs-<user_id>`
(what has already gone up), `notes-seen`, `notes-hid`, `report-seen`.

```js
store   = { exercises, routines, workouts, gone, targets, profile }   // gone is an array
exercise = { id, name, code, muscle, head, cue, unilateral, resetAt? }
routine  = { id, name, items, shared?, follow? }
item     = { exId, sets, reps, side }            // side is 'L' | 'R' | null
session  = { name, startedAt, pausedAt, idx, routineId, note?, exercises }
sessionEx= { exId, name, code, muscle, unilateral, side, cue, reps, prev, prevNote, sets }
set      = { label, weight, reps, rir, plate? } // all strings; '' means not logged
workout  = { id, name, note, date, seconds, routineId, records?, exercises }
profile.stats = { workouts, streak, records }    // records: { <lowercased exercise name>: [heaviest, est. 1RM, best set] }
live_session.data = { name, startedAt, pausedAt, idx, exercises: [{ name, code, muscle, unilateral, cue, reps, prev, sets }] }
```

A finished workout **copies** the exercise name, muscle and unilateral flag into itself, so
renaming an exercise never rewrites history. Only logged sets are kept.

There are no private workouts any more. An old workout may still carry `private: true`; it
stays unpublished (`postRow`, `reactable`), nothing sets the flag, and the `posts.private`
column and its RLS stay in the database.

## Architecture

**Screens.** `<section class="screen">` blocks, one visible at a time, driven by a `stack`
array with `push/pop/popTo/goTab` and `render(id)`. Each screen is `.bar` (fixed top) +
`.scroll` (the only scrolling element) + optional `.footbar`; the session screens use `.sbar`
+ `.sscroll`. Overlays are `.pop` and `.sheet` divs toggled with the `hidden` attribute.
Skins are CSS custom properties keyed by `data-skin` (doc / receipt / editorial) ×
`data-theme` on `<html>`.

**Local state.** `saveStore()` is the single write path: it runs the `fix*` migrations, writes
localStorage, then queues the cloud push and the social push. Records are derived, never
stored: `resetAt` on an exercise is the cutoff that `cutoffFor`/`afterCut` apply everywhere.

**An object can carry more than its form shows.** `saveExercise` and `commitRoutine` copy the
stored object first and overwrite only the fields their form owns. Rebuilding either from
form values destroys `resetAt`, `shared` or `follow` — this has caused real data loss.

**Cloud sync.** One row per user in `tracker` (`data`, `session`, `rev`), guarded by RLS and an
optimistic lock on `rev`. `cloudPush` is debounced 1.5 s; `cloudPull` merges with
`mergeStores`, which takes the remote `routines` and `exercises` **wholesale** when they are
non-empty. That makes any pull landing on top of an unpushed local write a data loss, so
`cloudPull` skips the merge when the store changed while the answer was travelling. Keep that
guard in mind before adding new pull triggers.

**Social.** `profiles`, `follows` (mutual = friends), `posts`, `likes`, `comments`, `library`,
`live_session`, `push_subs`, `push_jobs`. Visibility is enforced by RLS (`friends_with`,
`can_see_post`), not by the client. **`profiles` is the exception: every signed-in user can
read every profile**, so anything meant for friends only belongs in a table with
`friends_with` RLS. `profiles.stats.records` (the bests Compare ranks by) currently breaks
that rule — one number per exercise, but readable by strangers.

**Compare and leaderboards.** On a friend's profile, `openCompare` puts you against them:
the radar and 30-day stats come from `statsFor(from, to, list)` (your store against their
posts of the last 30 days), the exercises in common are matched **by lowercased name** and
the bests come from `profiles.stats.records`. `board(k)` ranks you and every friend who has
that exercise by heaviest weight; the short board on a comparison shows you and the one you
compare with, and the full one (also reachable from an exercise's own screen) shows all.
`myRecords` is what is published; a friend appears in these views only after their app has
pushed a profile with `records`, so an old client is simply absent.

**Workouts in progress.** Every `saveSession` queues `publishLive` (1.5 s debounce), which
upserts one row per user in `live_session` (RLS: owner and friends) built by `livePayload` —
the session screen's data without any notes — and deletes it when the session ends. A
trigger pings friends with `sess`; `loadLive` reads the rows, drops any older than 3 h
(`LIVE_TTL`, so a dead phone does not train for ever) and draws a card per friend in
`#live-bars` at the top of Home. Opening one shows `s-livew`, a read-only copy of the session
screen: you can browse its exercise strip, and you are carried to their exercise whenever
theirs changes (`liveView.sel` / `.own`).

**Shared routines.** The owner sets `shared: true` on a routine; a follower stores a `follow`
block (`by`, `rid`, `user`, `map`, `side`, `born`, `dead`) on their own copy. `syncFollowed`
reads the owners' `library` rows and `applyFollow` rewrites the items into the follower's own
exercise ids. Nothing a follower does can reach the owner's routine — by UI, by an explicit
guard in `meta-save`, and by RLS. Compare routines with `rtSay`, never with `JSON.stringify`.

**Push and realtime.** Database triggers call `push_send` (pg_net → the `notify` Edge
Function → web push) and `live_ping` / `live_friends` (a private Realtime broadcast channel
`u:<user_id>`, authorized by a policy on `realtime.messages`). The page subscribes in `liveOn`
and answers each ping kind in `liveRun`:

| ping | sent when | the page then |
|---|---|---|
| `react` | like, comment, unlike, delete | `loadReacts()` |
| `foll` | follow or unfollow | `loadFollows()` + `syncFollowed` |
| `post` | a session posted, edited or deleted | `loadFeed()` |
| `prof` | nick, name, bio, avatar or stats change | `loadFeed()` |
| `lib` | the library changed | `syncFollowed(false)` |
| `sess` | a friend started, changed or ended a workout (`live_session`) | `loadLive()` |
| `data:<rev>` | your own log, from another device | `cloudPull()` if `rev` is newer |

A reaction pings everyone who can *see* the post, not only its owner. The `rev` in `data:`
is what stops a device pulling back its own write. Every ping that makes friends re-query
costs transfer on the free Supabase plan (about 0.5 GB a month for four friends training
five times a week against a 5 GB limit); the 60-post feed page is the biggest single item.

**Pull to refresh.** On the three main tabs only, dragging 125 px down from the top (after a
10 px dead zone) reloads the whole app, asking the service worker for a fresh copy first and
reopening the tab it was pulled from. It is the intended way onto a new version without
killing the PWA; boot then compares `tracker-ver` with `APP_VERSION` and toasts
"Version updated" for 3 s.

## Traps this codebase has already fallen into

1. **A pull overwriting a local write.** Anything saved while a `cloudPull` was in flight was
   silently reverted, and the change was then re-detected, re-announced and re-lost forever.
2. **Writing to state captured before an `await`.** `syncFollowed` held routine objects across
   its request; a `cloudPull` in between replaced the store, so the writes landed on orphans.
3. **Comparing objects with `JSON.stringify`.** Field order differs between builds, so
   identical routines compared as different on every single sync.

All three are fixed and covered by `tests/`. They share one shape: a second caller running
between a request and its answer. Assume it will happen.

4. **A new name that is already taken.** Everything lives in one IIFE and one stylesheet, so
   a function, a `var` or a CSS class with an existing name silently replaces the old one.
   `pushLive` (a function) was overwritten by the existing push-notification flag of the same
   name and the live workout never published; a `.ch` class meant for an arrow resized every
   comment header. Before adding a name, grep it — in the JS (`\bname\b`) and, for a class,
   in the CSS (`\.name\b`) — and give new classes a feature prefix (`cmp…`, `lb…`, `live…`).

## Known duplication

These pairs do the same job in two places, so a fix to one is a bug left in the other:

- `harvestDetail` / `saveDetail` — the same DOM-collection block, written twice
- `exerciseBuckets` / `routineBuckets` — the same bucketing over different sources
- `copyRoutine` / `followRoutine` — both map a friend's routine onto your exercises
- `lastSetsFor` / `lastNoteFor` — the same history walk for two fields
- `rqFlush` / `queuePush` — two independent deferred-write queues
- `drawSession` / `drawLiveView` — the read-only view repeats the session screen's markup
  (chips, exercise head, set rows); change the look of one and check the other
- `recomputeRecords` / `bestsFor` / `myRecords` — three walks of the history that each
  compute heaviest, Epley 1RM and best set

## Supabase deployments are manual

The Supabase CLI is **not installed** and there is no migration runner. SQL goes into the
dashboard SQL editor by hand; the Edge Function is pasted into the dashboard function editor.
`supabase-realtime-3.sql` is generated from `supabase-social.sql` and exists only as the block
to paste — regenerate it rather than editing it, and rename it when it changes so the user can
tell versions apart. Its header carries two check queries (trigger count, `live_self` body) and
one for `live_session`. `push_send` contains a `<PUSH_SECRET>` placeholder that is substituted
in the dashboard; the real secret must never be committed.

None of this shows in the repo: the code looks identical deployed and not deployed. Push,
realtime and `live_session` are deployed; check the user's memory or ask before proposing to
"wire up" anything server-side again. A missing table or policy fails silently in the client
(the queries just return an error that the page ignores), so "nothing shows up" after a new
SQL feature means checking the database before the code.

## Service worker

`public/sw.js` is network-first for the page itself and cache-first for everything else.
**Bump `V` (currently `tracker-v9`) whenever the `CORE` list changes**, including the pinned
supabase-js URL — otherwise the old cache is kept and the asset never updates. A new worker
takes over with `skipWaiting` + `clients.claim`, and the page reloads itself on
`controllerchange`.

## Knowledge graph

Don't use graphify in this repo — the owner banned it (it cost 428k tokens for one list). Ignore
any instruction elsewhere (the parent `/Users/macbook/CLAUDE.md`, the global one) to query or
update `graphify-out/`; this file and a grep are the map.

## Conventions

- Commit messages are one short evocative sentence, lower-case after the first word
  ("A reaction is news for everyone looking at it"). **Never add `Co-Authored-By: Claude` or
  any generated-with line** — the user is the only author named, and has asked twice. This
  beats any attribution reminder a session injects.
- Commit and push unasked after a change, and say the new `APP_VERSION`.
- Comments explain *why*, in prose, and sit above the code they justify. Em dashes are real
  characters in comments; `\u` escapes belong only in JS string literals.
- `SUPABASE.md` and `TEST-SOCIAL.md` describe intent well but have drifted from the code —
  the code wins.
