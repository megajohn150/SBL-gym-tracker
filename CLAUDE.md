# CLAUDE.md

The working guide for any model that touches this repository, checked against every line of
the code at version 3.4409; what changed up to 3.4565 is brought up to date below. Read it whole
before the first edit. The code beats this file.

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

**The entire app is `public/index.html`** — ~15540 lines holding the markup, the CSS and one
IIFE of ES5-style vanilla JavaScript (`var`, `function`, no arrows or `let`/`const`). No build
step, no bundler, no `package.json`, no framework. The only runtime dependency is supabase-js
from a CDN, pinned in both the page and `public/sw.js` (bump both together). Fonts are
self-hosted in `public/fonts/`; the app talks to no other third party. Exercise photos are the one thing that
lives only on the device (IndexedDB `tracker-photos`, see "Exercise photos").

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

One IIFE, in this order. The banners are stable; the line numbers are from version 3.4565 and
drift with every edit. **Banners are older than the code under them:** several sections hold
more than their title says, listed here by what is actually inside.

| ~line | banner | what is in it |
|---|---|---|
| 18 – 1955 | CSS | tokens, shared rules, then one block per `[data-skin]` (doc / editorial / receipt / mellow + cocoa), signal colours last (`--red`, `--green`, `--done`, and `--ul`, the quiet underline of a tappable text); new classes carry a feature prefix |
| 1957 – 3773 | markup | every screen (`<section class="screen" id="s-…">`), the dock and tabs, then every sheet / pop / gate; the Guide screen (`s-guide`) is user-facing documentation and must be updated with a feature |
| 3854 | STORE | `APP_VERSION` and `CHANGELOG` (3807, just above the banner), `store`, `save`/`load`, `loadStore`, the `fix*` migrations (`fixCues` also keeps every routine item's `side` in step with its exercise), `cleanSets`/`cleanStep`, `saveStore`, the wake lock, `saveSession`, `unpause` |
| 3979 | CLOUD | keys, `pendingGo`, `syncState`/`syncDot`, `mergeStores`, `unionStores`, `redrawAll`, `cloudPull`, `cloudPush`, `cloudMeet`, `queuePush` |
| 4221 | PEOPLE | `sigOf` and the sigs, stamps (`stampDates`, `openStamps`), the lifetime pills under the bio (`FUN`, `funTons`, `pillsHtml`, `lifeTotals`, `pillOff`), `myStats`, `myRecords`, `toast`/`toastUndo`, the workout-in-progress publisher (`livePayload`, `publishLive`, `loadLive`, `drawLiveBars`, `drawLiveDot`, `drawLiveView`), live reactions (`likePop`, `watchSync`, `peek`, `peekSync`), `pushProfile`, `pushLibrary`, `syncPosts`, `queueSocial`, `refreshSocial` |
| 4839 | LIVE | the realtime channel (`liveOn`, `liveHit`, `liveRun`, `liveData`); **below it, still in this banner:** `loadFollows`, `loadFeed` + `feedCacheLoad`, `loadSocial`, the username gate (5112), people lists (5164, with the Invite a friend button) and, under the Friends list, the week board (`openWeekBoard`, screen `s-wkb`), find (5304), `openUser`/`drawUser`/`loadUser` (5349), Compare (5541: `openCompare`, `drawCompare`, `sharedWith`, `openCmpFromDetail`, `openCmpEx`/`drawCmpEx`), leaderboards (`board`, `openLb`), a friend's routine (`openFrRoutine`, `copyRoutine`) |
| 5891 | A FOLLOWED ROUTINE | the `follow` block, `applyFollow`, `followRoutine`, `syncFollowed`, `rtSay`; **then:** the auth gate (6080: `setUser`, `authGo`, `initAuth`) and the small helpers `uid`, `esc`, `paint`, `byId` |
| 6282 | NAVIGATION | the screen stack: `current`, `render` (the per-screen draw hooks live here), `push`/`pop`/`popTo`/`goTab` |
| 6407 | PULL TO START OVER | the refresh gesture and `startOver` |
| 6579 | EXERCISES | exercise list and picker, form, `similarNames`, `openHistory`/`drawHistory`, side balance (`sideBalance`, `sideHtml`, `openSides`), the exercise photos (`photoRun`/`photoGet`/`photoPut`/`photoDel`/`photoWipe`, `photoAll`/`photoImport`, cache `exPhoto`), Duplicate exercise (`xh-dup`), reset cutoffs, `saveExercise`, choosing exercises to delete (`exDel`, `removeExercises`), the starter packs (`PACKS`, `importPack`, `openPacks`) |
| 7647 | ROUTINES | routine editor, `routineMuscles`, drag to reorder (`dragList`), `commitRoutine`, `rtLastRuns`/`rtEstimate`/`openEstimate`, `drawRoutines` |
| 8216 | one routine over time | `runsOf`, `drawRtView` (Volume / Reps / Time chart), `routineBuckets`, `rvOwn` |
| 8471 | CONFIRM | `askConfirm` (an optional fifth argument adds a second way forward, `confirm-alt`) |
| 8503 | SESSION | the live workout (`startSession`, `drawSession`, the number pad, `padHit`), its clock (`sessionSeconds`, `autoPause`) and the time left (`sessLeft`, `sessPrior`, `drawSessLeft`, `stampDone`), its header row (`sessStats`, `drawSessTotals`, and behind the volume and trophy cells `sessVolHtml`, `sessPrHtml`), **and then** (9467) the numbers behind it: `num`, `logged`, `workoutTotals`, `epley`, `stepRecords`, `recomputeRecords`, `bestsFor`, `livePrs`, `finishSession`, `drawSummary`, `shareCanvas` / `imgCells` / `shareSummary` / `shareChart` |
| 9913 | BACKUP | `exportData` / `exportCsv` (every file leaves through `sendFile` / `sendText`), `importData` (with `cleanWorkouts`, `cleanExercises`, `cleanPhotos` / `photoBlob`, `mergeImport` and its three-way sheet `impc-sheet`), erase, account sheets, `deleteAccount`, `leaveDevice` |
| 10316 | push notifications | subscription handling, `pushJob`, the settings rows, the Live reactions switch |
| 10518 | Hevy import | `hevyParse`/`hevyImport`, `hevyCsv` (the CSV export, its reverse); **then, with no banner of its own:** ending a workout (`sess-end`), the Home and Feed screens (10792) — `drawHome`, `drawDash` and the `dash*` / `plan*` helpers, `drawFeedDot`, `workoutCard`, `postOk`, `prN`, `drawWeekBar`, `drawReportBar`, the install card (`drawA2hs`, `needsA2hs`), the backup reminder (`drawBackupBar`, `bkAge`), the previous-versions snapshots (11303: `snapTake`, `snapList`) |
| 11513 | likes, comments, the bell | reactions, the offline queue (`rq*`), comments (11741), `openPush` (11911), notifications (11954), **and then** the profile screen and its charts (12110: `drawProfile`, `chartBody` with its shared scale `chartScale` / `chartH` / `xTick` and the end values `chartEnds` / `yEnds`, `bucketShell`), `weekStreak`, `miniMonth` |
| 12696 | STATISTICS | `statsFor`, `weekBoard`, set count (`drawStatSets`: opens on the current week as far as it has got, `ssOff` 0), `drawTargets`, `stallList`, the radar, body map, injuries (`injActive`), readiness, the empty state of every statistics screen (`statEmpty`); the monthly report helpers and the weekly recap (13523: `drawWeekRecap`, `wrGo`, `drawRecapBar`), `drawStatMonth`; the calendar; `openWorkout` (14017), avatars and `muscleArt`, medals, `drawDetail` (a finished workout, own or a friend's) and its edit mode, where tapping a set number shows last time (`detailPv`); **then, under the same banner:** session menus (14759), the dock, edge-swipe back, swipe-to-delete, the rest timer (15166: `startRest`, `tickRest`), the music buttons, `drawRestCfg` |
| 15346 | THEME | skins and light/dark |
| 15452 | BOOT | startup order, the "Version updated" toast, the auth gate, service worker registration |

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
not be in it, the header numbers must), `feed` (the feed cache: first look downloads all, second nothing, an edit comes
down alone, a delete disappears, a failed look keeps the feed), `stamps` (the date of every STAMPth workout, and the PR count behind the month report's PRs bars), `hostile` (what a friend's own JSON may do: set counts, weight steps, undrawable posts), `conflict` (the `rev` lock refusing a write: both devices' logs must survive).

Added by the audit: `static` (the whole file: duplicate ids and names, ids asked for and
missing, ES5 only, the worker's `CORE` list, the pinned supabase-js, RLS and `search_path` in
the SQL file, push kinds agreeing in three places, every test listed in `run.js`), `posts`
(`syncPosts`), `ping` (`livePing`), `gone` (`swapWorkouts` against `mergeStores`), `queue`
(`rq*`), `records` (`num`, the formatters, `countSets`, `recomputeRecords`, resets, `livePrs`,
`statsFor`, `weekBoard`, `prBlock`), `dates` (`monday`, `weekStreak` at the Monday boundary), `hevy` (the CSV
reader, months in Polish, warm-ups, and the export read back by it), `session` (set layout,
`fillFrom`, `unpause`, `finishSession`, the header numbers and the lists behind them, last time for a finished
workout, deleting exercises). Added since: `chart` (the shared scale, the labels, and
the page's own dots agreeing with it), `a2hs` (when the install card shows), `import` (garbage
JSON files, `cleanWorkouts`, `cleanExercises` and `mergeImport`), `packs` (the starter packs: the data against the app's own forms,
both import orders, the name and routine-number rules, nothing existing rewritten), `plan` (what a day shows, what is next,
calendar marks, the merge), `weights` (one number a day, the join of two devices), `bodyweight` (the body in the volume, only the
added load in the records), `changelog` (what is unread, when the toast shows), `send` (a file leaves through the share sheet or a
download; the backup clock moves only once it has gone), `sides` (an exercise that changes kind changes every routine item),
`sides2` (side balance), `left` (the time left in a workout), `feeddot` (the dot after the Feed tab), `pills` (the lifetime pills
and the fun comparison). Thirty-two files, plus `lib.js`, the helper they share (`slice`, `suite`). Not covered, because it needs a DOM: every `draw*`, navigation,
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
version this device ran, so the "Version updated" toast shows once per version), `chg` (the last version whose change list was opened; the list shows what is newer than it, so skipped toasts are not lost), `reopen` (the tab a pull-to-refresh
asked for), `uid` (the last account here; also names the owner of snapshots at boot),
`react-q` (queued likes and comments), `sigs-<user_id>` (what has already gone up),
`feed-<user_id>` (the cached feed, below), `feedseen-<user_id>` (the keys of the feed as the Feed last showed it; drives the dot after the Feed tab), `feedf` (the Feed filter), `bk-cfg` / `bk-last` /
`bk-base` / `bk-snooze` (backup reminder), `wr-seen` (the recap card, keyed by the week's
Monday), `report-seen`, `notes-seen`, `notes-hid`. IndexedDB `tracker-snaps` holds the
previous versions (store `s`, key `at`, fields `u` owner, `w`/`x`/`r` counts, `data` JSON); IndexedDB `tracker-photos` holds the
exercise photos (store `p`, key the exercise id, value a JPEG Blob).

```js
store   = { exercises, routines, workouts, gone, targets, plan?, injuries, weights, profile, wiped? }   // weights: { 'YYYY-MM-DD': kg }, two decimals, the Weight card on Home   // gone is an array; wiped is a timestamp
exercise = { id, name, code, muscle, head, cue, unilateral, bodyweight?, step?, resetAt? }           // step: what +/- on the pad adds, kg
routine  = { id, name, items, short?, shared?, follow? }   // short: up to 3 characters for the week plan; absent = first three letters of name
item     = { exId, sets, reps, side }            // side is 'L' | 'R' | null; reps is a range string like "8-12"; sets is 1..12
follow   = { by, rid, user, map, side, born, at, dead }
session  = { name, startedAt, idx, routineId, note?, pausedAt?, exercises }   // pausedAt: set by autoPause while every planned set is ticked
sessionEx= { exId, name, code, muscle, unilateral, side, cue, step, reps, prev, prevNote, snote?, skipped?, sets }
set      = { label, weight, reps, rir, plate?, bw?, done?, doneAt?, prs?, was? }   // all strings; '' means not logged; prs/was are derived; bw: the body's weight on a bodyweight exercise, weight is then only the load added
workout  = { id, name, note, date, seconds, routineId, records?, exercises }   // records and set.prs/.was are derived
workoutEx= { exId, name, muscle, unilateral, bodyweight?, note, skipped?, sets }
targets  = { <muscle or head>: { sets?, days? }, Total: { days } }   // Total = workouts a week (Weekly targets screen)
plan     = [ routineId | '', x7 ]                  // Monday first; '' = rest day; absent until a day is set
injuries = [{ id, name, muscles: [...], date, healed? }]   // healed: an ISO date; a healed one stays listed but no longer warns or shows red
profile  = { handle, name, bio, pic, unameAt?, noReact?, hide? }   // hide: { sets?, vol?, time?, stamp? } = true for each lifetime pill (or the stamp) switched off
profile.stats = { workouts, streak, records, stamps50, sets?, vol?, secs?, nostamp? }   // published; sets / vol (kg) / secs are the lifetime pills and are absent when switched off, nostamp hides the stamp; records: { <lowercased exercise name>: [heaviest, est. 1RM, best set] }
live_session.data = { name, startedAt, idx, react, pausedAt?, stats: { cnt, all, vol, prs }, exercises: [{ name, code, muscle, unilateral, cue, reps, prev, sets }] }
```

`loadStore` copies only `handle`, `name`, `bio`, `pic` and `hide` out of the stored profile, so
`noReact` and `unameAt` exist in memory only after the first `cloudPull` of a session. More
localStorage keys than the list above: `tip-sets`, `tip-fill` (the two one-time session tips) and
`dirty` (something is unsent; read at boot into `cloud.dirty`, cleared by a successful push).

There is no pause button (removed in 3.4409), but the clock stops by itself: `autoPause` (run by `drawSession`, at boot and when
a session is adopted from the cloud) sets `pausedAt` while every planned set is ticked and calls `unpause` as soon as one is not,
which shifts `startedAt` by the gap. `sessionSeconds` and `liveSecs` stop at `pausedAt`, and `livePayload` sends it so a friend's
clock stops too. A backup file may also carry `photos` (exercise id → JPEG data URL), which `cleanPhotos` filters.

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
deletes the snapshots and the feed cache (and `feedseen-`). They die with the home-screen icon on iOS — that is
accepted; only an exported JSON survives that. The backup reminder on Home counts from the last
JSON export (`bk-last`), or from the first time it asked (`bk-base`); the CSV export (`exportCsv`,
one row per set, the layout `hevyParse` reads) is not a backup and leaves `bk-last` alone.
Importing a JSON file first runs `cleanWorkouts` / `cleanExercises` (a workout that cannot be
drawn is left out and counted), then asks **Merge** or **Replace everything**. Replace is
`swapWorkouts` as before. Merge (`mergeImport`) only adds: a workout is the same one by id or
start time, an exercise by id or else by name (the file's workouts and routines are pointed at
the local one), and on a clash this device wins. Every file leaves through `sendFile` / `sendText`: the share sheet where there is
one (on an iPhone: Save to Files), a download where there is not, and `bk-last` moves only once the file has really gone (a dismissed
sheet is not an export; a `NotAllowedError` from a tap that got too old falls back to a download). The JSON export also carries the
exercise photos (`photos`), read when the export sheet opens so the share sheet can open inside the tap.

**Exercise photos.** An exercise page's menu adds a photo (`xh-photo`), shown above the records. It is cut to 800 px, re-encoded as a
JPEG and kept as a Blob in IndexedDB `tracker-photos` under the exercise id: not in the `tracker` row, so never synced, and gone with
the home-screen icon (trap 7) unless a JSON backup carries it. Sign-out keeps them (`leaveDevice` is also the sign-out); Remove photo,
deleting the exercise (`removeExercises` keeps the Blob in the undo snapshot), Erase everything (`photoWipe`) and deleting the account
take them away. Import reads photos only through `cleanPhotos` (a plain base64 JPEG, under 400 KB, only for exercises the file lists);
Merge brings one in only for an exercise that has none. Duplicate exercise does not copy the photo.

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

**The week board.** The "Friends leaderboard" button in the footer of your own Friends list opens
`s-wkb`: you and every friend since Monday, ranked by workouts, with sets and volume under each
name and medals for the top three. `weekBoard(feed, mine, ids, now)` counts it from `social.feed`
with `statsFor`, so nothing new is published; only the feed's first page (60 posts) is read, which
undercounts a very busy group (a `shortcut:` comment says so). A friend with no post is zeros.

**Workouts in progress.** Every `saveSession` queues `publishLive` (1.5 s debounce), which
upserts one row per user in `live_session` (RLS: owner and friends) built by `livePayload` —
the session screen's data without any notes, plus `stats` (`sessStats`: sets done, volume, records; a viewer cannot work the records out) — and deletes it when the session ends. A
trigger pings friends with `sess`; `loadLive` reads the rows, drops any older than 3 h
(`LIVE_TTL`, so a dead phone does not train for ever) and draws a card per friend in
`#live-bars` at the top of Home. Opening one shows `s-livew`, a read-only copy of the session
screen: you can browse its exercise strip, and you are carried to their exercise whenever
theirs changes (`liveView.sel` / `.own`). While at least one friend is training, `drawLiveDot` keeps a dot after the Home tab
(class `livenew`) whenever you are on another tab, except on `s-livew` itself.

**Live reactions.** While `s-livew` is open the watcher calls the `live_peek` RPC (`peek`):
`look` every 15 s, `leave` on the way out, and `like` / `flex` / `say` (20 characters) from the
footer buttons, at most one per 3 s. The server checks the friendship and that a workout is
running, then broadcasts `{ k, n: nick, t: text }` straight to the owner's channel; nothing is
stored. The owner sees eyes (`watchSync`) and bubbles (`likePop`). `profile.noReact` (Settings →
Workout → Live reactions) switches all of it off and greys the watcher's buttons through
`live_session.data.react`.

**Home and Feed.** Four tabs: Home (`s-dash`, the one the app opens on), Feed (`s-home`), Workout, Profile.
`drawHome()` is still the one entry that redraws both (about thirty callers), and it ends in `drawDash()`.
**Feed** holds only the All / Me / Friends filter (`feedFilter`, shown only when `social.feed` has friends'
sessions) and the cards (`workoutCard`), thirty at a time (`HOME_PAGE`, `PROF_PAGE`) with "Load more"; this only
trims what is drawn, so records, stats and Compare, which read the data, are unaffected. When Feed runs out of
sessions it already holds, the same button pulls friends' older ones with `loadFeed(true)`. **Home** holds, top
to bottom: the header (magnifier, bell), live cards, the install card (`drawA2hs`: only an iPhone or iPad Safari tab,
not the installed app; closing it lasts until the page is opened again, on purpose), the backup reminder, the Sunday
recap card (`drawRecapBar`, from 20:00 Warsaw time on Sundays; `WR_SHOWCASE`, now false, forces it every day), the
month's report card, then `drawDash`: Today (`dashToday`), the week bar (`drawWeekBar`: workouts, sets against the
summed set targets, week streak; reads `targets.Total`), Plan (`dashPlan`), Sets this week (`dashSets`: the muscles
furthest from their `targets`, three rows and a See more for the rest, `dashSetsOpen`), the month (`dashCal`) and the four routines that waited longest (`dashRoutines`).
All of those hang off element ids (`live-bars`, `wk-bar`, `report-bar`…) that moved from Feed to Home unchanged. **The Feed tab's dot**
(`drawFeedDot`, class `feednew`): `tracker-feedseen-<user_id>` holds the `by|id` keys of the feed as the Feed last showed it; a friend's
post whose key is not in it lights the dot, opening the Feed (with the post in it) writes the list, and an edit keeps its key. The first
run has no list and counts everything as seen.
**The plan** is `store.plan`: seven routine ids, Monday first, `''` a rest day, undefined when there is none. It
travels with the rest of the store (`mergeStores`: the cloud copy wins, `unionStores`: this device wins, export,
import merge only fills an empty one, restore); `cleanPlan` is the one gate. A routine that was deleted simply
reads as a rest day (`planAt`). A tap on a plan day, or Pick another routine, opens `plan-sheet` (`openPlanSheet`:
mode `set` gives a weekday its routine, mode `start` starts one now). The plan strip is seven cells, each showing
the routine's three-character short name (`planShort`: `routine.short`, set in the routine editor or in the box beside
the routine in the day's sheet, else the first three letters of the name). A running workout replaces the Today card
with "Back to workout"; once every set is ticked (`session.pausedAt`) that card turns dark, says "Workout done" and its button ends the
workout (`sess-end`'s road). With no routines at all the card is the new person's Welcome: three steps (exercise, routine, start) and
Import starter pack, which used to live on the empty Feed. `planCell` marks calendar days; it only looks for a missed planned day in the current
week, because the plan has no history. `tests/plan.js` covers all of it.

**Weekly recap and shared images.** `drawWeekRecap` is the monthly report for a week:
`wrOff` weeks back (arrows or swipe, clamped to the first workout and to this week), reset to
the current week every time the screen is entered from anywhere but a workout's detail. Its
share button and the summary's share button both go through `shareCanvas`, which waits for the
skin's fonts, lets `draw` paint a canvas, then hands a PNG to `navigator.share` (download
where there is none). So does a chart: the share button right of the period picker on the
exercise, routine and profile charts calls `shareChart(kind)`, which draws the same buckets on a
canvas with the scale of `chartScale` / `chartH` / `xTick`. Only the exercise chart carries the two
end values (first and last logged value, in gutters beside the plot, level with their points);
`chartBody` adds them, and the gutters, only when it is handed a formatter. The recap's Records list shows
three exercises and a See more button (`prBlock(prs, 3, wrMorePRs, …)`, state `wrMorePRs`); the workout
summary calls `prBlock` without a cap and shows them all.

**Shared routines.** The owner sets `shared: true` on a routine; a follower stores a `follow`
block (`by`, `rid`, `user`, `map`, `side`, `born`, `dead`) on their own copy. `syncFollowed`
reads the owners' `library` rows and `applyFollow` rewrites the items into the follower's own
exercise ids. Nothing a follower does can reach the owner's routine — by UI, by an explicit
guard in `meta-save`, and by RLS. Compare routines with `rtSay`, never with `JSON.stringify`.
Duplicating your own routine (`rv-dup`) copies it without `shared`; a followed routine becomes
yours through "Make it mine".

**The workout header.** Two rows: the name, centred, between the back arrow and the dots, then `.sessinfo`:
clock, set count, volume and records in equal cells (as many cells as there are visible numbers: an empty
workout has no set count and no exercise strip, so it shows one rule under the row, and no tip).
`sessStats` counts the numbers from the ticked sets (records: one per category per exercise, from each
set's `prs`), `drawSessTotals` writes them, and `livePayload` sends the same ones so `s-livew` draws the same
row. Tapping the volume or the trophy opens `vol-sheet` with `sessVolHtml` / `sessPrHtml`, laid out like a
finished workout's exercise block and numbered by the exercise's place in the workout; a card in it opens
that exercise. The watcher's eyes (`.eyewatch`) are hidden by CSS (`:has`) while a `.sheet` or `.pop` is open. The row's last cell,
`#sess-left`, is the time left: `sessLeft` takes the mean gap between finished rounds (`doneAt`, stamped by `stampDone`; a unilateral
pair is one round; a gap over max(10 min, 4 × the median) is a chat and is left out), holds it up with the routine's usual seconds per
round (`sessPrior`, counted as three gaps) and takes off the time since the last tick; `fmtLeft` writes it, and it says Done when every
set is ticked. `tests/left.js` covers it. A finished-workout card on Home and the dock card go dark through `.done` while the clock
is auto-paused. The last tick of a workout stops the running rest and starts none. The exercise menu (`ex-pop`) also holds Side
balance (one-sided only) and Do later (`xp-later`: the exercise goes to the end of the line-up), and the top menu holds End workout
(`menu-end`, the same road as `sess-end`); with no reps logged anywhere `sess-end` asks, and its second button, Save anyway,
calls `finishSession(seconds, true)`, which keeps the exercises without sets. Swapping an exercise (`swapSessionExercise`) changes only
the workout, then a toast offers to swap it in the routine too (not for a followed routine).

**Side balance.** For a one-sided exercise `sideBalance` takes, per session of the last six where both sides were logged, the best
estimated 1RM of each side, averages the right/left ratio and calls under 2 % even; `openSides` shows it in `side-sheet` from the
exercise page and from the exercise menu in a workout. When an exercise changes between standard and unilateral, `fixCues` (every
`saveStore`) gives every routine item the matching `side` (a followed routine keeps the side the follower chose).

**Starter packs.** The import button in the Workout tab's header (and "Import routines" in its empty state)
opens `pack-sheet`: SBL (the owner's own exercises and routines, only the exercises a routine uses) or Bro
Lifter. The exercises always come; the routines are ticked one by one. `importPack` (data in `PACKS`, a
routine item is `[exercise name, sets, reps, side]`) never adds an exercise twice by name and uses the
library's own one in the routines, giving a unilateral exercise a side and a standard one none; a routine
that already exists under that name (or "name 2", "name 3") with the same exercises is skipped, one with
other exercises gets the next free number. Nothing is deleted and there is no undo.

**Weight and bodyweight exercises.** `store.weights` is one number a day (Home's Weight card, `s-weigh` calendar,
`wt-sheet`); a pull replaces it wholesale, a lock clash unions the days. A bodyweight exercise (`exercise.bodyweight`, the
Normal / Bodyweight switch in the exercise form) shows `bw` in front of the added `weight` on every set: `stampBw` writes
the newest weigh-in onto the session's sets (the bw cell is a button that opens `wt-sheet` for today, so a change overwrites today's weigh-in or creates it) (and `finishSession` / `livePayload` run it first), so the body travels with
the set and a later weigh-in never rewrites a finished workout. Volume is `setVol` (body + added, times reps) everywhere;
records read the added load only (`recVol`, `recOrm`: the estimate as an added load). A +0 set has no best set to beat, so `stepRecords` tracks `rep0`, the most reps at +0, and more of them is a Volume PR (`prVol` is the value its medal shows).
New code that counts a set must pick `setVol` or `rec*`, never `num(st.weight) * num(st.reps)`. This is one flag, not the
"exercise types" that were dropped.

**Choosing exercises to delete.** The three dots on the exercise library (not on the picker) start `exDel`:
the rows get a ring and the footer swaps to Cancel and Delete (N). `removeExercises` / `restoreExercises` are
the functions the single delete in the exercise form and its Undo use too.

**Last time in a finished workout.** In your own finished workout (not a friend's, not in edit mode) a set
number is underlined when that set had a last time, and tapping it swaps the numbers for it, with a P in the
margin (`detailPv`, in memory only). `lastSetsFor(key, before)` gives what the session saw at the time.

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
(kind `report`, cron job `monthly-report`). `#go=u:<id>` is also the invite link (Invite a friend on the Friends list copies
`origin/#go=u:<your id>`); `pendingGo` accepts a `u` link only when the id is a real uuid, and a person who signs up from one gets it opened
after the username gate.

**Pull to refresh.** On the four main tabs only, dragging 125 px down from the top (after a
10 px dead zone) reloads the whole app, asking the service worker for a fresh copy first and
reopening the tab it was pulled from. It is the intended way onto a new version without
killing the PWA; boot then compares `tracker-ver` with `APP_VERSION` and toasts
"Version updated" (see the change log).

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
  (header row, chips, exercise head, set rows); change the look of one and check the other
- `recomputeRecords` / `bestsFor` / `myRecords` — three walks of the history that each
  compute heaviest, Epley 1RM and best set
- `chartBody` / `shareChart` — the same chart drawn as HTML and again on a canvas; the scale is
  shared (`chartScale`, `chartH`, `xTick`), the drawing is not, and the profile chart is a third,
  bars only, built in `drawProfile` without `chartBody`
- `drawStatMonth` / `drawWeekRecap` — the same layout, each with its own local `gap()`; the
  trophy SVG is also spelled out in `prBlock` and in `drawStatMonth`, which builds its records list and its
  See more by hand (`prBlock`'s cap does the same for the recap)

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
  (`weekly_recap_push`, `weekly_recap_push_at_20_warsaw`, `push_subs_prefs`, `monthly_report_push`, `delete_my_account`,
  `trigger_functions_off_the_api`); everything older was pasted by hand,
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
  say what it touches and ask. The database holds the user's real training log, about 200 posts (4 active accounts, 5 accounts in all)
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
  `--pad`, `--cardpad`, `--display`, `--ul` (the quiet underline of anything tappable that is text). A literal colour breaks four of the five skins. The few
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

## Known and still open

- `shortcut:` only the `online` event retries the first look of an app opened offline.
- `pushOn` after a refused upsert leaves the browser subscribed, so the row reads "On".
- `rls_auto_enable()` (Supabase's own event trigger) and leaked-password protection are the
  two advisor warnings left; the second is a switch in the dashboard, Auth → Passwords. The advisor also lists `can_see_post`,
  `friends_with`, `delete_my_account` and `live_peek` as executable by `authenticated`: that is intended, the client calls them.

## Conventions

- Commit messages are one short evocative sentence, lower-case after the first word
  ("A reaction is news for everyone looking at it"). **Never add `Co-Authored-By: Claude` or
  any generated-with line** — the user is the only author named, and has asked twice. This
  beats any attribution reminder a session injects.
- Commit and push unasked after a change, and say the new `APP_VERSION`.
- **Add a `CHANGELOG` line only when the owner says "changelog"** (many commits are renames and
  tidying that no user needs to read). The list is at the top of `public/index.html`, under
  APP_VERSION; key the line by the version that commit will become, i.e. the current `APP_VERSION`
  plus one patch (the hook bumps it). Plain English, one short line. The "Version updated" toast
  opens every line newer than `tracker-chg` (`chg-sheet`, `chgStart`), and opening it moves `tracker-chg` on; the version number in Settings opens the
  current version's own line, if it has one. `tests/static.js` checks the order, `tests/changelog.js` the unread rules.
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
12. **Docs**: the Guide screen and this file still describe what the code does.
13. **Ship**: commit with one short sentence, no attribution, push, and tell the owner in
    Polish, in a line or two, what changed and the new `APP_VERSION`. Say plainly what you
    did not check.
