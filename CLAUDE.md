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
every commit — never edit that constant by hand. Pushing to `main` deploys.

## How the tests work

`tests/*.js` have no dependencies and no DOM. They **slice a block of functions out of
`public/index.html` by its first and last line and `eval` it** in a scope that defines the
globals it closes over (`store`, `sb`, `me`, `social`, `byId`, `uid`, `sigOf`, `saveStore`,
the `draw*` functions as no-ops). They therefore test the shipped text, not a copy. If you
rename the function a test slices from, the test fails loudly with "nie ma tego w index.html"
— fix the marker, do not weaken the test.

Stubs resolve through `Promise.resolve().then(...)` so a test can mutate or swap `store`
while a request is "in flight". Three bugs in this codebase were races of exactly that shape;
keep new tests in that style.

## Verifying in a browser

Claude cannot sign in (no password), so anything behind auth is unreachable in the preview.
The working method: start the dev server, seed `localStorage['tracker-data']` with a store
object, reload, remove the `#gate` element, then drive the UI from the console. Check the
Receipt skin in dark mode (`tracker-skin=receipt`, `tracker-mode=dark`) and nothing else
unless asked. Clear `localStorage` when done.

## Architecture

**Screens.** `<section class="screen">` blocks, one visible at a time, driven by a `stack`
array with `push/pop/popTo/goTab` and `render(id)`. Each screen is `.bar` (fixed top) +
`.scroll` (the only scrolling element) + optional `.footbar`. Overlays are `.pop` and
`.sheet` divs toggled with the `hidden` attribute. Skins are CSS custom properties keyed by
`data-skin` (doc / receipt / editorial) × `data-theme`.

**Local state.** `store = { exercises, routines, workouts, gone, targets, profile }` in
`localStorage['tracker-data']`, plus `session` (the workout in progress) on its own.
`saveStore()` is the single write path: it runs the `fix*` migrations, writes localStorage,
then queues the cloud push and the social push. Records are derived, never stored:
`resetAt` on an exercise is the cutoff that `cutoffFor`/`afterCut` apply everywhere.

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
by the client. `supabase-social.sql` is the source of truth for the schema.

**Shared routines.** The owner sets `shared: true` on a routine; a follower stores a `follow`
block (`by`, `rid`, `map`, `side`, `born`, `dead`) on their own copy. `syncFollowed` reads the
owners' `library` rows and `applyFollow` rewrites the items into the follower's own exercise
ids. Nothing a follower does can reach the owner's routine — by UI, by an explicit guard in
`meta-save`, and by RLS. Compare routines with `rtSay`, never with `JSON.stringify`: field
order differs between builds and a text comparison reports phantom changes forever.

**Push and realtime.** Database triggers call `push_send` (pg_net → the `notify` Edge
Function → web push) and `live_ping` / `live_friends` (a private Realtime broadcast channel
`u:<user_id>`). The page subscribes in `liveOn` and answers each ping kind in `liveRun`.
A reaction pings everyone who can *see* the post, not only its owner.

## Supabase deployments are manual

The Supabase CLI is **not installed** and there is no migration runner. SQL goes into the
dashboard SQL editor by hand; the Edge Function is pasted into the dashboard function editor.
`supabase-realtime-2.sql` is generated from `supabase-social.sql` and exists only as the block
to paste — regenerate it rather than editing it, and rename it when it changes so the user can
tell versions apart. `push_send` contains a `<PUSH_SECRET>` placeholder that is substituted in
the dashboard; the real secret must never be committed.

None of this shows in the repo: the code looks identical deployed and not deployed. Check the
user's memory or ask before proposing to "wire up" anything server-side again.

## Conventions

- Commit messages are one short evocative sentence, lower-case after the first word
  ("A reaction is news for everyone looking at it"). **Never add `Co-Authored-By: Claude` or
  any generated-with line** — the user is the only author named, and has asked twice.
- Comments explain *why*, in prose, and sit above the code they justify. Em dashes are real
  characters in comments; `\u` escapes belong only in JS string literals.
- `SUPABASE.md` and `TEST-SOCIAL.md` are historical design and test-plan docs in Polish. They
  describe intent well but have drifted from the code — the code wins.
- `others/` holds older one-file variants of the app that nothing serves.
