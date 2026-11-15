# FABLE.md

The working guide for any model that touches this repository. It is `CLAUDE.md` (the file
Claude Code loads by itself) corrected against the code at version 3.4407, after one full
read of every file, and extended with the rules, the traps and the checklist that the read
turned up. Nothing loads this file automatically: if you were pointed here, read it whole
before the first edit. When the two files disagree, this one was checked later; the code
beats both.

## How to work here, in six lines

1. Find the section in the map, grep the function, read a window. Never the whole file.
2. Before an edit, grep every caller of what you touch and every name you add.
3. Make the smallest change that fully works, in the style of the lines around it.
4. Assume a second caller runs between every request and its answer (see the traps).
5. Prove it: `node tests/run.js`, the syntax check, and a browser only for looks.
6. Run the checklist at the bottom, then commit, push and say the new `APP_VERSION`.

## What this is

SBL Tracker, a gym tracker PWA, installed to the iOS home screen, hosted on Cloudflare Pages
(`gym-tracker-9hr.pages.dev`) with Supabase behind it. One user plus a handful of friends.

**The entire app is `public/index.html`** — ~13000 lines holding the markup, the CSS and one
IIFE of ES5-style vanilla JavaScript (`var`, `function`, no arrows or `let`/`const`). No build
step, no bundler, no `package.json`, no framework. The only runtime dependency is supabase-js
from a CDN, pinned in both the page and `public/sw.js` (bump both together). Fonts are
self-hosted in `public/fonts/`; the app talks to no other third party.

The app's name is shown as "SBL Tracker" (page title, manifest, home-screen title, sign-in gate, share images, push titles). Only the display name changed: the `tracker-` storage keys, the `tracker-v…` cache name, the `tracker` table, the `tracker-go` message and the `tracker-snaps` database keep the old word on purpose, renaming them would orphan every device's data.

All UI text is English. The user writes and reads Polish — talk to them in Polish, keep the
code and its comments in English.

## Start here, and keep it cheap

This file is the map. It is loaded for free at the start of every session — reading the
source to learn the architecture is paying twice.

- **Never read `public/index.html` whole.** The map below names the functions of every
  section, so a hit is usually one `grep -n "function name" public/index.html` and a window
  around it. Function names are unique across the file — see trap 4 before you add one.
- **`node tests/run.js` is the fast feedback loop** — seconds, no tokens, no browser.
  Run it after any change to logic it covers (sync, followed routines, the pull race, records
  and leaderboards, the live-workout payload, the feed cache).
- **Skip the browser unless the change is visual** (how something looks, not how it behaves).
  State, navigation and data logic get `node --check`, a node test, or reading the code. When
  the browser is needed: Cocoa skin only, one mode, recipe under "Verifying in a browser".
- **Do not re-derive what is written here.** Data shapes, ping kinds, traps and the deploy
  story are all below; they were expensive to learn and are kept current.
- **Ask which area the work is in** if the request is vague. "Routines", "realtime", "stats"
  each map to one section below.

## Map of `public/index.html`

One IIFE, in this order. The banners are stable; the line numbers are from version 3.4407 and
drift with every edit. **Banners are older than the code under them:** several sections hold
more than their title says, listed here by what is actually inside.

| ~line | banner | what is in it |
|---|---|---|
| 17 – 1751 | CSS | tokens, shared rules, then one block per `[data-skin]` (doc / editorial / receipt / mellow + cocoa), signal colours last (`--red`, `--green`, `--done`); new classes carry a feature prefix |
| 1753 – 3333 | markup | every screen (`<section class="screen" id="s-…">`), the dock and tabs, then every sheet / pop / gate; the Guide screen (`s-guide`) is user-facing documentation and must be updated with a feature |
| 3371 | STORE | `store`, `save`/`load`, `loadStore`, the `fix*` migrations, `cleanSets`/`cleanStep`, `saveStore`, the wake lock, `saveSession` |
| 3478 | CLOUD | keys, `pendingGo`, `syncState`/`syncDot`, `mergeStores`, `unionStores`, `redrawAll`, `cloudPull`, `cloudPush`, `cloudMeet`, `queuePush` |
| 3692 | PEOPLE | `sigOf` and the sigs, stamps (`stampDates`, `openStamps`), `myStats`, `myRecords`, `toast`/`toastUndo`, the workout-in-progress publisher (`livePayload`, `publishLive`, `loadLive`, `drawLiveBars`, `drawLiveView`), live reactions (`likePop`, `watchSync`, `peek`, `peekSync`), `pushProfile`, `pushLibrary`, `syncPosts`, `queueSocial`, `refreshSocial` |
| 4241 | LIVE | the realtime channel (`liveOn`, `liveHit`, `liveRun`, `liveData`); **below it, still in this banner:** `loadFollows`, `loadFeed` + `feedCacheLoad`, `loadSocial`, the username gate (4501), people lists (4550), find (4644), `openUser`/`drawUser`/`loadUser` (4689), Compare (4875: `openCompare`, `drawCompare`, `sharedWith`, `openCmpFromDetail`, `openCmpEx`/`drawCmpEx`), leaderboards (`board`, `openLb`), a friend's routine (`openFrRoutine`, `copyRoutine`) |
| 5215 | A FOLLOWED ROUTINE | the `follow` block, `applyFollow`, `followRoutine`, `syncFollowed`, `rtSay`; **then:** the auth gate (5394: `setUser`, `authGo`, `initAuth`) and the small helpers `uid`, `esc`, `paint`, `byId` |
| 5579 | NAVIGATION | the screen stack: `current`, `render` (the per-screen draw hooks live here), `push`/`pop`/`popTo`/`goTab` |
| 5696 | PULL TO START OVER | the refresh gesture and `startOver` |
| 5868 | EXERCISES | exercise list and picker, form, `similarNames`, `openHistory`/`drawHistory`, reset cutoffs, `saveExercise` |
| 6392 | ROUTINES | routine editor, `routineMuscles`, drag to reorder (`dragList`), `commitRoutine`, `rtLastRuns`/`rtEstimate`/`openEstimate`, `drawRoutines` |
| 6954 | one routine over time | `runsOf`, `drawRtView` (Volume / Reps / Time chart), `routineBuckets`, `rvOwn` |
| 7209 | CONFIRM | `askConfirm` |
| 7231 | SESSION | the live workout (`startSession`, `drawSession`, the number pad, `padHit`), **and then** (8024) the numbers behind it: `num`, `logged`, `workoutTotals`, `epley`, `stepRecords`, `recomputeRecords`, `bestsFor`, `livePrs`, `finishSession`, `drawSummary`, `shareCanvas` / `imgCells` / `shareSummary` |
| 8353 | BACKUP | `exportData`, `importData`, erase, account sheets, `deleteAccount`, `leaveDevice` |
| 8563 | push notifications | subscription handling, `pushJob`, the settings rows, the Live reactions switch |
| 8749 | Hevy import | `hevyParse`/`hevyImport`; **then, with no banner of its own:** ending a workout (`sess-end`), the Home screen (8995) — `drawHome`, `workoutCard`, `postOk`, `prN`, `drawWeekBar`, `drawReportBar`, the backup reminder (`drawBackupBar`, `bkAge`), the previous-versions snapshots (9115: `snapTake`, `snapList`) |
| 9304 | likes, comments, the bell | reactions, the offline queue (`rq*`), comments (9530), `openPush` (9700), notifications (9743), **and then** the profile screen and its charts (9899: `drawProfile`, `chartBody`, `bucketShell`), `weekStreak`, `miniMonth` |
| 10427 | STATISTICS | `statsFor`, set count, `drawTargets`, `stallList`, the radar, body map, injuries, readiness; the monthly report helpers and the weekly recap (11190: `drawWeekRecap`, `wrGo`, `drawRecapBar`), `drawStatMonth`; the calendar; `openWorkout` (11650), avatars and `muscleArt`, medals, `drawDetail` (a finished workout, own or a friend's) and its edit mode; **then, under the same banner:** session menus (12283), the dock, edge-swipe back, swipe-to-delete, the rest timer (12670: `startRest`, `tickRest`), the music buttons, `drawRestCfg` |
| 12850 | THEME | skins and light/dark |
| 12957 | BOOT | startup order, the "Version updated" toast, the auth gate, service worker registration |

## Commands

```bash
python3 -m http.server 8765 --directory public   # dev server (no watch, no reload); .claude/launch.json names it "tracker"
node tests/run.js                                # the whole suite
node tests/feed.js                               # one file; each is standalone
```

The syntax gate, as one command (run it after every edit to `index.html`):

```bash
node -e "const f=require('fs'),h=f.readFileSync('public/index.html','utf8');f.writeFileSync('/tmp/app.js',h.slice(h.lastIndexOf('<script>')+8,h.lastIndexOf('</script>')))" && node --check /tmp/app.js
```

There is nothing to compile and nothing to install. "Build" is saving the file; "deploy" is
`git push` to `main`.

There is no linter and no formatter. `node --check` on the extracted script is the only
syntax gate (extract the last `<script>` block of `index.html` to a temp file); the tests
catch the rest. A new test file must also be added to the `files` list in `tests/run.js`, or
the suite never runs it.

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
| `public/fonts/` | self-hosted Inter, JetBrains Mono, Newsreader, Fraunces (latin + latin-ext, so Polish letters work); `fonts.css` is linked from the page |
|  `supabase/supabase-social.sql` | **source of truth** for the server: tables, RLS, triggers, cron jobs |
| `supabase/supabase-realtime-3.sql` | generated from the above; the old paste-by-hand block |
| `supabase/functions/notify/` | Edge Function that turns a trigger into a web push |
| `tests/` | node, no dependencies — see below; `fake-supabase.js` + `fake-page.js` are a browser harness, not tests |
| `markdown/SUPABASE.md`, `markdown/TEST-SOCIAL.md` | Polish design and test-plan docs, drifted from the code |
| `markdown/CHANGES.md` | a one-off list of what one long session changed (3.4258–3.4272); not maintained |
| `markdown/WORKING-WITH-CLAUDE.md` | the owner's own Polish note on spending less of the limit; not for you |
| `markdown/IDEAS-SZCZEGOLY.md` | the owner's Polish list of ideas worth building; read it before proposing a feature |
| `public/imgs/`, `public/logo/` | sprite sheets (muscles, avatars, light and dark), the body map SVG, the icons; every file is in the service worker's `CORE` list |
| `.git/hooks/` | `pre-commit` bumps `APP_VERSION`; `commit-msg` strips any Claude attribution line. Not in the repo: a fresh clone has neither |

## How the tests work

`tests/*.js` have no dependencies and no DOM. They **slice a block of functions out of
`public/index.html` by its first and last line and `eval` it** in a scope that defines the
globals it closes over (`store`, `sb`, `me`, `social`, `byId`, `uid`, `sigOf`, `saveStore`,
`load`/`save`, the `draw*` functions as no-ops). They therefore test the shipped text, not a
copy. If you rename or move the function a test slices from, the test fails loudly with "nie
ma tego w index.html" — fix the marker, do not weaken the test. `feed.js` slices from
`loadFeed` to `loadSocial`, so keep `feedCacheLoad` and `feedTok` between them.

Stubs resolve through `Promise.resolve().then(...)` so a test can mutate or swap `store`
while a request is "in flight". Every bug these tests were written for was a race of exactly
that shape; keep new tests in that style.

Suites: `follow`, `routines`, `pull` (the three races), `compare` (`myRecords` and the
leaderboard ranking), `live` (the payload a friend gets of your running workout — notes must
not be in it), `feed` (the feed cache: first look downloads all, second nothing, an edit comes
down alone, a delete disappears, a failed look keeps the feed), `stamps` (the date of every STAMPth workout, and the PR count behind the month report's PRs bars), `hostile` (what a friend's own JSON may do: set counts, weight steps, undrawable posts), `conflict` (the `rev` lock refusing a write: both devices' logs must survive).

Added by the audit: `static` (the whole file: duplicate ids and names, ids asked for and
missing, ES5 only, the worker's `CORE` list, the pinned supabase-js, RLS and `search_path` in
the SQL file, push kinds agreeing in three places, every test listed in `run.js`), `posts`
(`syncPosts`), `ping` (`livePing`), `gone` (`swapWorkouts` against `mergeStores`), `queue`
(`rq*`), `records` (`num`, the formatters, `countSets`, `recomputeRecords`, resets, `livePrs`,
`statsFor`), `dates` (`monday`, `weekStreak` at the Monday boundary), `hevy` (the CSV reader,
months in Polish, warm-ups), `session` (set layout, `fillFrom`, `unpause`, `finishSession`).
Eighteen files, 207 assertions. Not covered, because it needs a DOM: every `draw*`, navigation,
gestures, the auth gate, the service worker.

## Verifying in a browser

Claude cannot sign in (no password), so anything behind auth is unreachable in the preview.
Two methods, cheapest first:

1. **Seed the store.** Start the dev server (`preview_start` with name `tracker`), seed
   `localStorage['tracker-data']` with a store object (and `tracker-skin` = `cocoa`), reload,
   remove the `#gate` element, then drive the UI from the console. Enough for anything that
   is only local. Clear `localStorage` and `indexedDB.deleteDatabase('tracker-snaps')` when done.
2. **A fake Supabase, for anything social** (Compare, leaderboards, live workouts, the feed).
   `node tests/fake-page.js` writes `public/__t.html`: `index.html` with supabase-js replaced
   by `tests/fake-supabase.js` (a chainable query builder over a plain `window.DB`, a signed-in
   user `me`, four mutual friends `f1`–`f4` with posts and `profiles.stats.records`). Serve it
   with the dev server and open `/__t.html` — it must be http from inside the project, the
   preview pane shows `file://` pages as static snapshots. Play a friend by changing
   `DB.live_session` and calling `__ping('sess')`. The file is git-ignored; delete it
   afterwards. In the fake store `gone` is an **array**.
   The service worker also runs on localhost and stores every successful navigation as
   `./index.html`, `/__t.html` included: afterwards unregister it or clear the caches, or the
   next offline open of the dev origin shows the fake page.

Touch gestures can be exercised with synthetic `TouchEvent`s on `document`. Note that
`requestAnimationFrame` does not fire while the preview pane is hidden, so a screenshot (which
forces a frame) is sometimes needed before reading an animated style back. A screen fades in
for .25 s after navigation, so an immediate screenshot looks washed out.

## Data shapes

`save(k, v)` / `load(k)` prefix every key with `tracker-`. The keys in use: `data` (the
store), `session` (written directly as `tracker-session`), `skin`, `mode`, `xstyle`, `rest`,
`rest-run`, `restcfg`, `music` (links stay on the device, never synced), `ver` (the last
version this device ran, for the "Version updated" toast), `reopen` (the tab a pull-to-refresh
asked for), `uid` (the last account here; also names the owner of snapshots at boot),
`react-q` (queued likes and comments), `sigs-<user_id>` (what has already gone up),
`feed-<user_id>` (the cached feed, below), `feedf` (the Home filter), `bk-cfg` / `bk-last` /
`bk-base` / `bk-snooze` (backup reminder), `wr-seen` (the recap card, keyed by the week's
Monday), `report-seen`, `notes-seen`, `notes-hid`. IndexedDB `tracker-snaps` holds the
previous versions (store `s`, key `at`, fields `u` owner, `w`/`x`/`r` counts, `data` JSON).

```js
store   = { exercises, routines, workouts, gone, targets, injuries, profile, wiped? }   // gone is an array; wiped is a timestamp
exercise = { id, name, code, muscle, head, cue, unilateral, step?, resetAt? }           // step: what +/- on the pad adds, kg
routine  = { id, name, items, shared?, follow? }
item     = { exId, sets, reps, side }            // side is 'L' | 'R' | null; reps is a range string like "8-12"; sets is 1..12
follow   = { by, rid, user, map, side, born, at, dead }
session  = { name, startedAt, idx, routineId, note?, exercises }
sessionEx= { exId, name, code, muscle, unilateral, side, cue, step, reps, prev, prevNote, snote?, skipped?, sets }
set      = { label, weight, reps, rir, plate?, done?, prs?, was? }   // all strings; '' means not logged; prs/was are derived
workout  = { id, name, note, date, seconds, routineId, records?, exercises }   // records and set.prs/.was are derived
workoutEx= { exId, name, muscle, unilateral, note, skipped?, sets }
targets  = { <muscle or head>: { sets?, days? }, Total: { days } }   // Total = workouts a week (Weekly targets screen)
injuries = [{ id, name, muscles: [...], date }]
profile  = { handle, name, bio, pic, unameAt?, noReact? }
profile.stats = { workouts, streak, records, stamps50 }   // published; records: { <lowercased exercise name>: [heaviest, est. 1RM, best set] }
live_session.data = { name, startedAt, idx, react, exercises: [{ name, code, muscle, unilateral, cue, reps, prev, sets }] }
```

`loadStore` copies only `handle`, `name`, `bio` and `pic` out of the stored profile, so
`noReact` and `unameAt` exist in memory only after the first `cloudPull` of a session. More
localStorage keys than the list above: `tip-sets`, `tip-fill` (the two one-time session tips) and
`dirty` (something is unsent; read at boot into `cloud.dirty`, cleared by a successful push).

A workout cannot be paused any more (removed in 3.4409). `unpause` resumes a session that an
older version left paused, at boot and when one is adopted from the cloud; `liveSecs` still
reads `pausedAt` for a friend whose app is old enough to send it.

A finished workout **copies** the exercise name, muscle and unilateral flag into itself, so
renaming an exercise never rewrites history. Only logged sets (`reps > 0`) are kept; a ticked
(`done`) flag does not decide that.

There are no private workouts any more. An old workout may still carry `private: true`; it
stays unpublished (`postRow`, `reactable`), nothing sets the flag, and the `posts.private`
column and its RLS stay in the database.

## Architecture

**Screens.** `<section class="screen">` blocks, one visible at a time, driven by a `stack`
array with `push/pop/popTo/goTab` and `render(id)`; `push('x')` opens `s-x` and makes it
belong to the tab that pushed it. Each screen is `.bar` (fixed top) + `.scroll` (the only
scrolling element) + optional `.footbar`; the session screens use `.sbar` + `.sscroll`. A
screen's draw call is hooked in `render`; a screen that must remember something across a
return from its own child (the weekly recap's week, `wrOff`) decides in `render` whether the
screen it came from was that child. Overlays are `.pop` and `.sheet` divs toggled with the
`hidden` attribute; `#confirm-sheet` has a higher z-index so it can sit over another sheet.
Skins are CSS custom properties keyed by `data-skin` × `data-theme` on `<html>`; Mellow is light only;
Cocoa is light unless dark is picked by hand (`modeOf`: "system" stays light there).

**Local state.** `saveStore()` is the single write path: it runs the `fix*` migrations, writes
localStorage, then queues the cloud push and the social push. Records are derived, never
stored: `resetAt` on an exercise is the cutoff that `cutoffFor`/`afterCut` apply everywhere.
`weekStreak(list, at?)` counts consecutive Monday-to-Sunday weeks with a workout; an empty
current week does not break it.

**An object can carry more than its form shows.** `saveExercise` and `commitRoutine` copy the
stored object first and overwrite only the fields their form owns. Rebuilding either from
form values destroys `resetAt`, `shared` or `follow` — this has caused real data loss.

**Cloud sync.** One row per user in `tracker` (`data`, `session`, `rev`), guarded by RLS and an
optimistic lock on `rev`. `cloudPush` is debounced 1.5 s; `cloudPull` merges with
`mergeStores`, which takes the remote `routines` and `exercises` **wholesale** when they are
non-empty. That makes any pull landing on top of an unpushed local write a data loss, so
`cloudPull` skips the merge when the store changed while the answer was travelling. Keep that
guard in mind before adding new pull triggers. When the lock refuses a write (another device got there first) `cloudMeet` joins the two copies with `unionStores` (workouts by id, exercises/routines/injuries by id with this device winning a clash) and only then force-pushes; `cloudPull` cannot do this, it skips the merge whenever local changes are unsent. An empty `routines`/`exercises` in the cloud normally means a fresh row and local stands in, unless `store.wiped` is set: "Erase everything" and deleting the last routine or exercise set it, so the other devices drop their copies too. A red dot after the Profile tab (`syncDot`)
shows when the last sync said "Offline".

**Previous versions and backup.** Once a day, at boot, `snapTake` stores the whole store in
IndexedDB (seven kept, per owner; an empty store never replaces a full one). Settings → Data →
Previous versions restores one: it first snapshots the current state, then replaces `store`
and calls `cloudPush(true)`, which overwrites the cloud row instead of merging. Sign-out
deletes the snapshots and the feed cache. They die with the home-screen icon on iOS — that is
accepted; only an exported JSON survives that. The backup reminder on Home counts from the last
export (`bk-last`), or from the first time it asked (`bk-base`).

**Social.** `profiles`, `follows` (mutual = friends), `posts` (has `updated_at`), `likes`,
`comments`, `library`, `live_session`, `push_subs`, `push_jobs`. Visibility is enforced by RLS
(`friends_with`, `can_see_post`), not by the client. **`profiles` is the exception: every
signed-in user can read every profile**, so anything meant for friends only belongs in a table
with `friends_with` RLS. `profiles.stats` (`records` for Compare, `streak` for the badge)
currently breaks that rule — a number per exercise, but readable by strangers; the profile
screen shows the streak badge to friends only.

**The feed.** `loadFeed` reads the first page as a cheap list (`user_id,id,date,updated_at`),
compares each `updated_at` with `feed-<user_id>` in localStorage and downloads in full only the
posts that are new or changed; a post missing from the list simply leaves the feed, so edits
and deletes still arrive. A failed look leaves the feed as it is, and `feedTok` drops an
answer that a newer call has overtaken. Older pages (`loadFeed(true)`) are read in full and
not cached.

**Compare and leaderboards.** On a friend's profile, `openCompare` puts you against them:
the radar and 30-day stats come from `statsFor(from, to, list)` (your store against their
posts of the last 30 days), the exercises in common are matched **by lowercased name** and
the bests come from `profiles.stats.records` (`lbFr`, loaded by `loadCmpFriends`). `board(k)`
ranks you and every friend who has that exercise by heaviest weight. A friend's own finished
workout (`drawDetail` with `detailRO`) underlines a lift you share (`sharedWith`) and opens its
Compare screen (`openCmpFromDetail`). A friend appears in these views only after their app
has pushed a profile with `records`, so an old client is simply absent.

**Workouts in progress.** Every `saveSession` queues `publishLive` (1.5 s debounce), which
upserts one row per user in `live_session` (RLS: owner and friends) built by `livePayload` —
the session screen's data without any notes — and deletes it when the session ends. A
trigger pings friends with `sess`; `loadLive` reads the rows, drops any older than 3 h
(`LIVE_TTL`, so a dead phone does not train for ever) and draws a card per friend in
`#live-bars` at the top of Home. Opening one shows `s-livew`, a read-only copy of the session
screen: you can browse its exercise strip, and you are carried to their exercise whenever
theirs changes (`liveView.sel` / `.own`).

**Live reactions.** While `s-livew` is open the watcher calls the `live_peek` RPC (`peek`):
`look` every 15 s, `leave` on the way out, and `like` / `flex` / `say` (20 characters) from the
footer buttons, at most one per 3 s. The server checks the friendship and that a workout is
running, then broadcasts `{ k, n: nick, t: text }` straight to the owner's channel; nothing is
stored. The owner sees eyes (`watchSync`) and bubbles (`likePop`). `profile.noReact` (Settings →
Workout → Live reactions) switches all of it off and greys the watcher's buttons through
`live_session.data.react`.

**Home.** `drawHome` draws, top to bottom: live cards, the week bar (`drawWeekBar`: workouts,
sets against the summed set targets, week streak; the workouts cell reads `targets.Total`),
the backup reminder, the Sunday recap card (`drawRecapBar`, from 20:00 Warsaw time on Sundays, the hour
of the push; the `WR_SHOWCASE` flag, now false, forces it on every day), the previous month's report card, the All / Me / Friends filter
(`feedFilter`, shown only when `social.feed` has friends' sessions) and the feed. The feed
and the profile's workout list draw thirty cards (`HOME_PAGE`, `PROF_PAGE`) and add thirty per
"Load more"; this only trims what is drawn, so records, stats and Compare, which read the
data, are unaffected. When Home runs out of sessions it already holds, the same button pulls
friends' older ones with `loadFeed(true)`.

**Weekly recap and shared images.** `drawWeekRecap` is the monthly report for a week:
`wrOff` weeks back (arrows or swipe, clamped to the first workout and to this week), reset to
the current week every time the screen is entered from anywhere but a workout's detail. Its
share button and the summary's share button both go through `shareCanvas`, which waits for the
skin's fonts, lets `draw` paint a canvas, then hands a PNG to `navigator.share` (download
where there is none).

**Shared routines.** The owner sets `shared: true` on a routine; a follower stores a `follow`
block (`by`, `rid`, `user`, `map`, `side`, `born`, `dead`) on their own copy. `syncFollowed`
reads the owners' `library` rows and `applyFollow` rewrites the items into the follower's own
exercise ids. Nothing a follower does can reach the owner's routine — by UI, by an explicit
guard in `meta-save`, and by RLS. Compare routines with `rtSay`, never with `JSON.stringify`.
Duplicating your own routine (`rv-dup`) copies it without `shared`; a followed routine becomes
yours through "Make it mine".

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
| `look` / `leave` | a friend opened or left your running workout (`live_peek`) | eyes on or off (`watchOn`, `watchOff`); nothing is fetched |
| `like` / `flex` / `say` | a friend reacted to your running workout | `likePop`; nothing is fetched |

A reaction pings everyone who can *see* the post, not only its owner. The `rev` in `data:`
is what stops a device pulling back its own write. Every ping that makes friends re-query
costs transfer on the free Supabase plan (about 0.5 GB a month for four friends training
five times a week against a 5 GB limit); the feed cache above exists because the 60-post feed
page was the biggest single item.

Web push kinds in `notify`: likes, comments, replies, threads and follows carry an actor; the
self kinds have none — `rest` and `stale` are parked by the app in `push_jobs`, `recap` is
sent by the cron job `weekly-recap`. A tap goes to `#go=<kind>:…` on a cold start or a
`tracker-go` message when the app is open (`openPush`); `r` opens the weekly recap, `m` the monthly report
(kind `report`, cron job `monthly-report`).

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
   comment header; `.stweek` was already a week picker. Before adding a name, grep it — in the
   JS (`\bname\b`) and, for a class, in the CSS (`\.name\b`) — and give new classes a feature
   prefix (`cmp…`, `lb…`, `live…`, `wk…`, `strk`).
5. **Week arithmetic with `Math.floor`.** `weekStreak` counted a workout of this week as
   week −1, because the distance from Monday is negative after Monday; the current week never
   counted. Weeks are indexed with `Math.ceil` (0 = this week, 1 = last). Any new code that
   buckets by "weeks ago" has the same trap.
6. **A banner is not a boundary.** The STATISTICS banner still holds the workout detail, the
   session menus, the rest timer and the music buttons; Home sits under the Hevy import. Use
   the map above, not the banner names.
7. **Browser storage dies with the icon.** Removing the PWA from the iOS home screen wipes
   localStorage and IndexedDB. Everything that must survive lives in the `tracker` row.

8. **Unsent changes must survive a reload.** `cloud.dirty` is mirrored in `tracker-dirty`, so
   the first `cloudPull` after a restart sees it, skips the merge and pushes instead; the push
   meets the lock and `cloudMeet` joins the two copies. Without the flag the first pull takes
   the cloud's `routines`, `exercises`, `targets` and `profile` wholesale and adopts its
   session. Anything that sets or clears `cloud.dirty` must do the same to the stored flag,
   and sign-out removes it.
9. **One early `return` in a shared handler silences everything behind it.** The broadcast
   handler of the channel (`livePing`) serves the live reactions and every database ping. A guard added for
   one kind, placed before the dispatch, drops them all.
10. **A value that looks like a number is still a friend's JSON.** `profiles.stats`,
    `posts.data`, `library.data` and `live_session.data` are typed by nobody. `x || 0`,
    `x >= 50` and string concatenation do not make a number: use `Number()`, `Math.floor`,
    `prN`, `cleanSets`, and `esc()` for text. `profiles` is readable by every signed-in user,
    so its fields are a stranger's input, not a friend's.
11. **Marking something as sent before it is sent.** A signature, a flag or a "last synced"
    value written before the request resolves makes a failed request look finished for ever.
    Write it in the success branch.
12. **Tombstones only grow.** `store.gone` is unioned across devices by `mergeStores`, so
    removing an id from it locally (undo of a delete, a backup import, a restored version)
    lasts only until another device that still holds the id syncs.
13. **`var` inside a handler shadows the IIFE's name.** `var me = e.target.closest(…)` in the
    month-report handler hides the signed-in user for that function. Harmless there; fatal
    in a function that also needs `me`, `store`, `session`, `sb`, `cloud`, `social` or `rest`.

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
- `drawStatMonth` / `drawWeekRecap` — the same layout, each with its own local `gap()`; the
  trophy SVG is also spelled out in `prBlock` and in `drawStatMonth`

## Supabase: Claude has access through an MCP connector

The `gym-tracker` project (id `nzagghskfwdosmopiuuk`, eu-west-1, Postgres 17) is connected to
Claude as an MCP server. Its tools are deferred: load them with `ToolSearch` (query
`select:mcp__bfe03fa0-b049-472a-947a-a8da016a9c6b__execute_sql,...`) before calling.

What that buys: `apply_migration` (DDL, tracked), `execute_sql` (queries and data fixes; a
multi-statement call returns only the last result), `list_tables` / `list_extensions`,
`deploy_edge_function` / `get_edge_function` (the `notify` function, **v7** when this was written, confirm with `get_edge_function`, `verify_jwt` off,
deploy with that flag and the whole `index.ts`), `query_logs`, `get_advisors` (run it after
any RLS change). So the dashboard paste is no longer the only route.

How to work with it:

-  `supabase/supabase-social.sql` stays the **source of truth**. Change it first, then apply the same SQL
  with `apply_migration` and commit both together. `supabase/supabase-realtime-3.sql` is the old
  paste-by-hand block, generated from it; regenerate it only if the user still wants a paste.
- `list_migrations` holds only the migrations made through the connector
  (`weekly_recap_push`, `weekly_recap_push_at_20_warsaw`); everything older was pasted by hand,
  so do not replay  `supabase/supabase-social.sql` onto it — read the live state with `list_tables` /
  `execute_sql` and write a small incremental migration.
- pg_cron jobs: `drain-push` (every 10 s, sends parked `rest`/`stale` pushes) and
  `weekly-recap` (`0 18,19 * * 0`, UTC). pg_cron runs in UTC, so `weekly_recap_push` itself lets
  through only the run that is 20:00 in `Europe/Warsaw`, which keeps the hour fixed across the
  summer-time change; it pushes to everyone with a subscription who has a post this week.
- `monthly-report` (`0 8,9 1 * *`, UTC) calls `monthly_report_push`, built the same way: only
  the run that is 10:00 in Warsaw on the 1st goes through, to everyone with a subscription and
  a post last month. `delete_my_account()` is an RPC that deletes the caller's `auth.users`
  row; every table cascades from it.
- Not everything on the server came from the SQL file by hand: `new_user()` (a trigger on
  `auth.users` that gives every new account an empty `tracker` row with `rev` 0) was found
  live on 15 Nov 2026 and written into the file then. The migration
  `trigger_functions_off_the_api` took `execute` on every trigger function away from the API
  roles; a trigger fires without it. `friends_with` and `can_see_post` keep `authenticated`,
  the policies call them.
- Before a destructive statement (drop, delete, rewrite of `tracker`, `posts`, `profiles`),
  say what it touches and ask. The database holds the user's real training log, about 190 posts (4 active accounts, 5 accounts in all)
  and friends' data, and there is no branch or backup set up here. Additive changes
  (a function, a cron job, a nullable column) can be applied directly.
- `push_send` carries a `<PUSH_SECRET>` placeholder in the repo. Never write the real secret
  into a migration or into git; keep the placeholder in files and substitute it only inside
  the call, or leave that one function for the user. Functions that only *call* `push_send`
  need no secret.
- A missing table or policy still fails silently in the client, so after a SQL change check
  the database (`list_tables`, `get_advisors`) before the code.

## Friends' data is hostile input

A friend's `posts.data` and `library.data` are JSON their own client wrote, and RLS only checks
who wrote it. Never put a field from them into markup or a loop raw. `esc()` text, `prN(w)` for
`records`, `cleanSets` (1–12) for set counts, `cleanStep` for weight steps, `postOk` for a whole
post (a post that cannot be drawn is left out of the feed, one bad post must not stop Home).
`applyFollow`/`copyRoutine` clean on the way in and `fixCues` (run by every `saveStore`) cleans
what is already stored. `data-w="…"` takes `esc(w.id)`: post ids are text chosen by the poster.

## Service worker

`public/sw.js` is network-first for the page itself — but only up to 3 seconds: past that it
serves the cached copy and lets the slow fetch finish in the background to refresh it — and
cache-first for everything else. **Bump `V` (currently `tracker-v17`) whenever the `CORE` list
changes**, including the pinned supabase-js URL and the font files — otherwise the old cache is
kept and the asset never updates. A new worker takes over with `skipWaiting` + `clients.claim`,
and the page reloads itself on `controllerchange`. A changed `sw.js` alone is picked up without
a bump.

## Knowledge graph

Don't use graphify in this repo — the owner banned it (it cost 428k tokens for one list). Ignore
any instruction elsewhere (the parent `/Users/macbook/CLAUDE.md`, the global one) to query or
update `graphify-out/`; this file and a grep are the map.

## Rules for writing code

- **ES5 only inside the page**: `var`, `function`, string concatenation, no arrows, no
  `let`/`const`, no template literals, no `async`, no classes, no optional chaining. The
  tests and `sw.js` follow their own files' style (the tests are modern node).
- **No dependency, no build step, no new file for app code.** Everything goes into the one
  IIFE, in the section the map says it belongs to. A new function sits next to its callers.
- **One write path.** Store changes end in `saveStore()`, session changes in `saveSession()`
  (or `drawSession()`, which calls it). Never write `tracker-data` by hand, and never keep a
  reference to a `store` object across an `await` or a `.then`: look it up again by id.
- **Copy, then overwrite.** A form saves by copying the stored object and replacing only the
  fields the form owns (`saveExercise`, `commitRoutine`).
- **Markup is built from strings**, so every piece of text that a person typed goes through
  `esc()`, every number from outside through `Number`/`Math.floor`, and ids in `data-…`
  attributes through `esc()`. Prefer `textContent` when there is no markup to build.
  Redraw a scrolling screen with `paint(el, html)` so it keeps its place.
- **Events are delegated** from the screen's body or from `document`, keyed by a `data-…`
  attribute. A list that is redrawn must not get listeners on its rows.
- **Network answers**: check `r.error` first, change local state only on success, and guard
  against a newer call (`tok !== feedTok`) or a changed subject (`userView.id !== id`).
- **Server**: change `supabase/supabase-social.sql` first, apply the same SQL as a migration,
  run `get_advisors` after any RLS change. Every `security definer` function sets
  `search_path` and has `execute` revoked from `public, anon, authenticated` unless a client
  must call it (`live_peek`, `delete_my_account`).
- **Comments** say why, in prose, above the code. Keep the existing ones when you move code.
- **Tests** for anything with a branch that touches sync, hostile input or dates: slice the
  shipped text, stub through `Promise.resolve().then`, add the file to `tests/run.js`.

## Rules for design

- **Tokens, not colours.** Use `--bg`, `--surface`, `--fg`, `--fg-2`, `--fg-3`, `--line`,
  `--accent`, `--accent-ink`, `--red`, `--green`, `--done`, `--radius`, `--border`, `--dash`,
  `--pad`, `--cardpad`, `--display`. A literal colour breaks four of the five skins. The few
  literals that exist (medal gold, injury red on the body map) are deliberate.
- **Every skin, both lights.** A new component must hold in Document, Editorial, Receipt
  (monospace, 12.5 px base, no radius, dashed rules), Mellow and Cocoa (16 px radius, round
  buttons). Check Cocoa light first; it is the default and what the owner uses.
- **The screen frame is fixed**: `.bar` or `.head`, one `.scroll`, optional `.footbar`. The
  page itself never scrolls. A new screen is a `<section class="screen" id="s-…">` with
  `data-tab` and `data-title`, a draw hook in `render`, and a row in the Guide.
- **Phone first, 440 px wide at most.** Thumb-sized targets, safe-area insets on anything
  fixed to an edge, no hover-only affordance, no zoom (it is switched off on purpose).
- **Overlays**: `.sheet` for a choice or a form, `.pop` for a menu off the top-right dots,
  `askConfirm` for anything destructive, `toastUndo` after it. Toggle with `hidden`.
- **Words**: English, short, sentence case, no exclamation marks, no emoji in the chrome.
  Labels are small caps through `--lab`/`--labtrack`, not typed in capitals.
- **Reuse the existing blocks** before inventing one: `.rows` + `.row`, `.dsec`, `.wstats`,
  `.pseg`, `.seg`, `.bar-card`, `.cutrow`, `.privrow`, `.mmore`, `.note`, `.hint`.
- **Class names** get a feature prefix and a grep before they exist (trap 4).
- **Dropped for good, do not propose again**: exercise types, warm-up sets, auto-start of the
  timer on anything but a ticked set, private workouts.

## Mistakes a weaker model makes here, and the way out

| The mistake | Why it happens | Do this instead |
|---|---|---|
| Reads `index.html` top to bottom "to understand it" | habit | map → `grep -n "function name"` → read 60 lines |
| Trusts a banner or a line number | they are older than the code | trust the function name; line numbers drift every commit |
| Writes `const`, arrows, template literals | modern default | ES5; the syntax check passes either way, the style does not |
| Adds a helper that already exists (`esc`, `num`, `logged`, `pad2`, `fmtDuration`, `fmtVolume`, `fmtKg`, `relDate`, `dmy`, `monday`, `addDays`, `nameKey`, `byId`, `routineById`, `uid`, `toast`, `askConfirm`, `paint`) | did not grep | grep the verb before writing it |
| Names a function or class that exists | one scope, one stylesheet | `grep -n "\bname\b"` in the script and `grep -n "\.name\b"` in the CSS first |
| Rebuilds an object from form fields | looks tidy | copy the stored object, overwrite the form's fields |
| Fixes one half of a duplicated pair | does not know the pair | read "Known duplication" before editing any of those |
| Puts a friend's field into markup | "it is our own data" | it is not: `esc`, `prN`, `cleanSets`, `cleanStep`, `postOk` |
| Adds a `cloudPull` trigger, or a reload, without thinking of unsent writes | sync looks simple | read traps 1, 2 and 8; push first, guard the merge |
| Compares objects with `JSON.stringify` | shortest code | `rtSay` for routines, `sigOf` only for "did my own copy change" |
| Buckets weeks with `Math.floor` or by milliseconds across a clock change | off-by-one hides until Monday | `monday()`, `addDays()`, `Math.ceil` as in `weekStreak` |
| Edits `APP_VERSION`, or the cache name without need | wants to be helpful | the hook owns the version; bump `V` only when `CORE` changes |
| Writes the push secret, or replays the whole SQL file | has the tools | placeholder stays; small incremental migration only |
| Opens the browser for a logic change | wants proof | a node test is the proof; the browser is for looks |
| Runs a destructive SQL statement to "clean up" | has `execute_sql` | say what it touches and ask; this is a real training log |
| "Fixes" a decision as if it were a bug: frozen followed routines, the toast on change, visible-not-followable, friends only, streak that forgives the current week | reads it as an oversight | these were chosen; ask before changing behaviour |
| Adds attribution to a commit, or a long report after a small change | default habit | one evocative sentence as the message, one or two lines as the reply, in Polish |
| Says "done" after the edit | no checklist | run the list at the bottom |

## The audit of 15 November 2026

Eleven bugs were found by reading every line, and fixed in 3.4409. They are listed because
each one is a shape that will come back; the test named after it is what keeps it away.

| What was wrong | Where | Kept away by |
|---|---|---|
| A stranger's `profiles.stats.workouts` went into markup unescaped | `drawUser`, `openStamps` → `cleanN` | `hostile` |
| Reactions switched off dropped every database ping | `liveOn` → `livePing` | `ping` |
| A failed upload of an edited workout was never retried | `syncPosts` (`sent`) | `posts` |
| Unsent changes were lost on reload; a finished workout came back as a session | `cloudPull`, `queuePush`, `tracker-dirty` | `pull` (case 4) |
| An app opened offline never loaded friends or the feed | the `online` listener | not tested |
| Pause was not saved | the feature was removed (`unpause`) | `session` |
| Sign-out left the push subscription with the old account | `leaveDevice` → `dropPush` | not tested |
| A friend's exercise name that was not text broke every search | `lentEx`, `fixCues`, `copyRoutine` | `hostile` |
| A selector and a `.map` built from a friend's JSON | `paintActs`, `medal` | `hostile` |
| A workout brought back was deleted again by the next device | `swapWorkouts`, the undo of a delete | `gone` |
| `pushOn` and `followSet` reported success on an error; the Guide described two things that are not there | both, and `s-guide` | not tested |

Still open, and known:

- `shortcut:` only the `online` event retries the first look of an app opened offline.
- `pushOn` after a refused upsert leaves the browser subscribed, so the row reads "On".
- `rls_auto_enable()` (Supabase's own event trigger) and leaked-password protection are the
  two advisor warnings left; the second is a switch in the dashboard, Auth → Passwords.

## Conventions

- Commit messages are one short evocative sentence, lower-case after the first word
  ("A reaction is news for everyone looking at it"). **Never add `Co-Authored-By: Claude` or
  any generated-with line** — the user is the only author named, and has asked twice. This
  beats any attribution reminder a session injects.
- Commit and push unasked after a change, and say the new `APP_VERSION`.
- Comments explain *why*, in prose, and sit above the code they justify. Em dashes are real
  characters in comments; `\u` escapes belong only in JS string literals.
- Spend the least usage that still fully does the job: short replies after a small change,
  checks proportional to the change, no browser for logic.
- `markdown/SUPABASE.md` and `markdown/TEST-SOCIAL.md` describe intent well but have drifted from the code —
  the code wins.

## Before you say it is done

Run it in this order. A line you skip is a line you report as skipped.

1. **Scope**: `git diff --stat` shows only what the task needed. No drive-by rewrites, no
   reformatting, no change to `APP_VERSION`.
2. **Names**: every function, `var` and class you added was grepped first and is unique.
3. **Callers**: every caller of a function whose behaviour changed was read, and the other
   half of any pair in "Known duplication" was changed or deliberately left.
4. **Syntax**: the `node --check` command from "Commands" prints nothing.
5. **Tests**: `node tests/run.js` ends with "Wszystko gra." New logic with a branch has a
   test, and the test file is in the `files` list.
6. **Style**: no `const`, `let`, `=>` or template literal in the page's script that you added
   (`git diff -U0 public/index.html | grep -E "^\+.*(=>|const |let )"` is empty).
7. **Hostile input**: nothing from `posts`, `library`, `profiles`, `live_session` or a ping
   reaches markup, a loop bound or a selector without `esc` / `Number` / a `clean*` helper.
8. **Sync**: no new write to state captured before a request; no new pull or reload that can
   land on unsent changes; nothing marked sent before it was.
9. **Service worker**: `V` bumped if and only if `CORE` changed; the supabase-js version is
   the same in the page and in `sw.js`.
10. **Server**: the SQL file and the applied migration say the same thing; `get_advisors`
    is clean; no secret in a file.
11. **Looks** (only if they changed): Cocoa light in the preview, the screen entered and left,
    one other skin glanced at; `public/__t.html` deleted, storage and caches cleared.
12. **Docs**: the Guide screen, `CLAUDE.md` and this file still describe what the code does.
13. **Ship**: commit with one short sentence, no attribution, push, and tell the owner in
    Polish, in a line or two, what changed and the new `APP_VERSION`. Say plainly what you
    did not check.
