# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A gym tracker PWA, installed to the iOS home screen, hosted on Cloudflare Pages
(`gym-tracker-9hr.pages.dev`) with Supabase behind it. One user plus a handful of friends.

**The entire app is `public/index.html`** — ~9800 lines holding the markup, the CSS and one
IIFE of ES5-style vanilla JavaScript. No build step, no bundler, no `package.json`, no
framework. The only runtime dependency is supabase-js from a CDN, pinned in both the page and
`public/sw.js` (bump both together).

All UI text is English. The user writes and reads Polish — talk to them in Polish, keep the
code and its comments in English.

## Commands

```bash
python3 -m http.server 8765 --directory public   # dev server (no watch, no reload)
node tests/run.js                                # the whole suite
node tests/follow.js                             # one file; each is standalone
```

There is no linter and no formatter. `node --check` on the extracted script is the only
syntax gate; the tests catch the rest.

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
| `supabase-realtime-2.sql` | generated from the above; the block the user pastes into the dashboard |
| `supabase/functions/notify/` | Edge Function that turns a trigger into a web push |
| `tests/` | node, no dependencies — see below |
| `others/` | older one-file variants of the app; nothing serves them |
| `*.json` in the root | exported training data (backup / Hevy import), not code |
| `SUPABASE.md`, `TEST-SOCIAL.md` | Polish design and test-plan docs, drifted from the code |
| `graphify-out/` | knowledge graph + its venv; git-ignored, 150 MB+ |

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

## Verifying in a browser

Claude cannot sign in (no password), so anything behind auth is unreachable in the preview.
The working method: start the dev server, seed `localStorage['tracker-data']` with a store
object, reload, remove the `#gate` element, then drive the UI from the console. Check the
Receipt skin in dark mode (`tracker-skin=receipt`, `tracker-mode=dark`) and nothing else
unless asked. Clear `localStorage` when done.

Touch gestures can be exercised with synthetic `TouchEvent`s on `document`. Note that
`requestAnimationFrame` does not fire while the preview pane is hidden, so a screenshot (which
forces a frame) is sometimes needed before reading an animated style back.

## Data shapes

`save(k, v)` / `load(k)` prefix every key with `tracker-`. The keys in use: `data` (the
store), `session` (written directly as `tracker-session`), `skin`, `mode`, `xstyle`,
`rest`, `reopen` (the tab a pull-to-refresh asked for), `uid`, `react-q` (queued likes and
comments), `sigs-<user_id>` (what has already gone up), `notes-seen`, `notes-hid`,
`report-seen`.

```js
store   = { exercises, routines, workouts, gone, targets, profile }
exercise = { id, name, code, muscle, head, cue, unilateral, resetAt? }
routine  = { id, name, items, shared?, follow? }
item     = { exId, sets, reps, side }            // side is 'L' | 'R' | null
session  = { name, startedAt, pausedAt, idx, routineId, note?, private?, exercises }
sessionEx= { exId, name, code, muscle, unilateral, side, cue, reps, prev, prevNote, sets }
set      = { label, weight, reps, rir, plate? } // all strings; '' means not logged
workout  = { id, name, note, date, seconds, routineId, private, records?, exercises }
```

A finished workout **copies** the exercise name, muscle and unilateral flag into itself, so
renaming an exercise never rewrites history. Only logged sets are kept.

## Architecture

**Screens.** `<section class="screen">` blocks, one visible at a time, driven by a `stack`
array with `push/pop/popTo/goTab` and `render(id)`. Each screen is `.bar` (fixed top) +
`.scroll` (the only scrolling element) + optional `.footbar`. Overlays are `.pop` and
`.sheet` divs toggled with the `hidden` attribute. Skins are CSS custom properties keyed by
`data-skin` (doc / receipt / editorial) × `data-theme` on `<html>`.

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
`push_subs`, `push_jobs`. Visibility is enforced by RLS (`friends_with`, `can_see_post`), not
by the client.

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
| `data:<rev>` | your own log, from another device | `cloudPull()` if `rev` is newer |

A reaction pings everyone who can *see* the post, not only its owner. The `rev` in `data:`
is what stops a device pulling back its own write.

**Pull to refresh.** On the three main tabs only, dragging 125 px down from the top (after a
10 px dead zone) reloads the whole app, asking the service worker for a fresh copy first and
reopening the tab it was pulled from. It is the intended way onto a new version without
killing the PWA.

## Traps this codebase has already fallen into

1. **A pull overwriting a local write.** Anything saved while a `cloudPull` was in flight was
   silently reverted, and the change was then re-detected, re-announced and re-lost forever.
2. **Writing to state captured before an `await`.** `syncFollowed` held routine objects across
   its request; a `cloudPull` in between replaced the store, so the writes landed on orphans.
3. **Comparing objects with `JSON.stringify`.** Field order differs between builds, so
   identical routines compared as different on every single sync.

All three are fixed and covered by `tests/`. They share one shape: a second caller running
between a request and its answer. Assume it will happen.

## Known duplication

These pairs do the same job in two places, so a fix to one is a bug left in the other:

- `harvestDetail` / `saveDetail` — the same DOM-collection block, written twice
- `exerciseBuckets` / `routineBuckets` — the same bucketing over different sources
- `copyRoutine` / `followRoutine` — both map a friend's routine onto your exercises
- `lastSetsFor` / `lastNoteFor` — the same history walk for two fields
- `rqFlush` / `queuePush` — two independent deferred-write queues

## Supabase deployments are manual

The Supabase CLI is **not installed** and there is no migration runner. SQL goes into the
dashboard SQL editor by hand; the Edge Function is pasted into the dashboard function editor.
`supabase-realtime-2.sql` is generated from `supabase-social.sql` and exists only as the block
to paste — regenerate it rather than editing it, and rename it when it changes so the user can
tell versions apart. `push_send` contains a `<PUSH_SECRET>` placeholder that is substituted in
the dashboard; the real secret must never be committed.

None of this shows in the repo: the code looks identical deployed and not deployed. Check the
user's memory or ask before proposing to "wire up" anything server-side again.

## Service worker

`public/sw.js` is network-first for the page itself and cache-first for everything else.
**Bump `V` (currently `tracker-v9`) whenever the `CORE` list changes**, including the pinned
supabase-js URL — otherwise the old cache is kept and the asset never updates. A new worker
takes over with `skipWaiting` + `clients.claim`, and the page reloads itself on
`controllerchange`.

## Knowledge graph

`graphify-out/` holds a graph of this repo. graphify is installed in a venv there, not
globally, so call it as `graphify-out/.venv/bin/graphify query "<question>"` (also `path` and
`explain`). Run `graphify-out/.venv/bin/graphify update .` after changing code to keep it
current — that pass is AST-only and free. The graph deliberately excludes `others/`, the JSON
data dumps and the images.

## Conventions

- Commit messages are one short evocative sentence, lower-case after the first word
  ("A reaction is news for everyone looking at it"). **Never add `Co-Authored-By: Claude` or
  any generated-with line** — the user is the only author named, and has asked twice.
- Comments explain *why*, in prose, and sit above the code they justify. Em dashes are real
  characters in comments; `\u` escapes belong only in JS string literals.
- `SUPABASE.md` and `TEST-SOCIAL.md` describe intent well but have drifted from the code —
  the code wins.
