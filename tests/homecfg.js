/* The Home layout: what cleanHome lets through, which layout a day uses, moving and hiding cards,
   and the numbers on the tiles. node tests/homecfg.js */
const { slice, suite } = require('./lib');
const t = suite('homecfg');

let state;
const store = { workouts: [], weights: {}, targets: {}, plan: undefined };
const env = {
  store,
  session: null,
  load: () => null,
  planIdx: (d) => (d.getDay() + 6) % 7,
  planAt: (i) => (store.plan && store.plan[i] ? { id: store.plan[i] } : null),
  monday: (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)),
  addDays: (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n),
  statsFor: () => state.week,
  weekStreak: () => state.streak,
  fmtKg: (kg) => kg + ' kg',
  wtKeys: () => Object.keys(store.weights).sort(),
  wtSign: (d) => (d > 0 ? '+' : d < 0 ? '-' : '±') + Math.abs(d).toFixed(2) + ' kg',
  byId: (id) => state.exercises.filter((x) => x.id === id)[0] || null,
  myRecords: () => state.records,
  nameKey: (s) => String(s).trim().toLowerCase()
};
const names = Object.keys(env);
const f = new Function(...names, slice('  var HOME_CARDS', '  function dashTiles(') +
  '; return { cleanHome: cleanHome, cleanLayout: cleanLayout, homeIsRest: homeIsRest, homeLay: homeLay, homeMove: homeMove,' +
  ' homeToggle: homeToggle, homeShow: homeShow, tileData: tileData, setCfg: function (c) { homeCfg = c; }, getCfg: function () { return homeCfg; },' +
  ' ids: HOME_CARDS.map(function (c) { return c[0]; }) };')(...names.map((n) => env[n]));

const ALL = f.ids;
t.is('a first launch looks like the old Home, with the new cards waiting', f.cleanHome(null).t, { o: ALL, h: ['qa', 'tiles'] });
t.is('and has nothing chosen yet', [f.cleanHome(null).split, f.cleanHome(null).tiles, f.cleanHome(null).qa], [false, [], []]);
t.is('the stored value at boot is the same clean one', f.getCfg(), f.cleanHome(null));
t.is('garbage of every shape is the default', [f.cleanHome('x'), f.cleanHome(7), f.cleanHome([1, 2]), f.cleanHome(true)].map((c) => c.t.o.join()), [ALL.join(), ALL.join(), ALL.join(), ALL.join()]);

const odd = f.cleanLayout({ o: ['rts', 'nope', 'today', 'rts', 5], h: ['weight', 'weight', 'bogus'] });
t.is('unknown and doubled cards are dropped, the others kept in the order given, the missing ones appended', odd.o, ['rts', 'today'].concat(ALL.filter((k) => k !== 'rts' && k !== 'today')));
t.is('hidden: only known cards, once each', odd.h, ['weight']);
t.is('a layout that hides nothing stays that way', f.cleanLayout({ o: ALL, h: [] }).h, []);
t.is('a layout with no hidden list takes the default one', f.cleanLayout({ o: ALL }).h, ['qa', 'tiles']);

const c1 = f.cleanHome({ split: true, t: { o: ['weight'], h: [] } });
t.is('the rest layout starts as a copy of the training one', c1.r, c1.t);
c1.r.o.reverse();
t.is('and is its own list, not the same one', c1.t.o[0], 'weight');
t.is('split is only ever a real true', [f.cleanHome({ split: 'yes' }).split, f.cleanHome({ split: 1 }).split, f.cleanHome({ split: true }).split], [false, false, true]);

const tl = f.cleanHome({ tiles: [
  { k: 'streak' }, { k: 'bogus' }, null, 'x', { k: 'e1rm' }, { k: 'e1rm', x: 'a'.repeat(100) }, { k: 'msets' }, { k: 'msets', m: 'Chest', junk: 1 }, { k: 'weight', x: 'q' }
] }).tiles;
t.is('tiles: unknown kinds, junk and half-made ones are dropped; extra fields too', tl.map((x) => JSON.stringify(x).replace(/a{60}/, 'A60')), ['{"k":"streak"}', '{"k":"e1rm","x":"A60"}', '{"k":"msets","m":"Chest"}', '{"k":"weight"}']);
t.is('tiles are capped at eight', f.cleanHome({ tiles: Array.from({ length: 20 }, () => ({ k: 'streak' })) }).tiles.length, 8);
t.is('quick actions: known, once each, at most six', f.cleanHome({ qa: ['weight', 'weight', 'nope', 'empty', 'last', 'stats', 'calendar', 'exercises', 'recap', 'find'] }).qa,
  ['weight', 'empty', 'last', 'stats', 'calendar', 'exercises']);
t.is('a tiles list that is not a list is none', f.cleanHome({ tiles: 'streak', qa: { a: 1 } }).tiles.length, 0);

// which layout a day uses
const wed = new Date(2026, 10, 18);       // a Wednesday
t.is('no plan at all: never a rest day', f.homeIsRest(wed), false);
store.plan = ['a', '', 'b', '', 'c', '', ''];
t.is('a planned day is a training day', f.homeIsRest(new Date(2026, 10, 16)), false);
t.is('a day with an empty slot is a rest day', f.homeIsRest(new Date(2026, 10, 17)), true);
env.session = null;
const withSession = new Function(...names, slice('  var HOME_CARDS', '  function dashTiles(') + '; return { rest: homeIsRest };')(
  ...names.map((n) => (n === 'session' ? {} : env[n])));
t.is('a workout already running makes it a training day, whatever the plan says', withSession.rest(new Date(2026, 10, 17)), false);

const cfg = f.cleanHome({ split: true, t: { o: ALL, h: [] }, r: { o: ALL.slice().reverse(), h: ['plan'] } });
f.setCfg(cfg);
const today = env.planIdx(new Date());                           // homeLay looks at the real today
store.plan = ['a', 'a', 'a', 'a', 'a', 'a', 'a'];
store.plan[today] = '';
t.is('split on, a rest day: the rest layout', f.homeLay() === cfg.r, true);
store.plan[today] = 'a';
t.is('split on, a training day: the training layout', f.homeLay() === cfg.t, true);
store.plan[today] = '';
cfg.split = false;
t.is('split off: the training layout even on a rest day', f.homeLay() === cfg.t, true);

// moving and hiding
const lay = { o: ['a', 'b', 'c'], h: ['b'] };
t.is('up from the top does nothing', [f.homeMove(lay, 'a', -1), lay.o.join('')], [false, 'abc']);
t.is('down from the bottom does nothing', [f.homeMove(lay, 'c', 1), lay.o.join('')], [false, 'abc']);
t.is('a step swaps neighbours', [f.homeMove(lay, 'b', -1), lay.o.join('')], [true, 'bac']);
t.is('an unknown card does not move', [f.homeMove(lay, 'z', 1), lay.o.join('')], [false, 'bac']);
f.homeToggle(lay, 'a');
f.homeToggle(lay, 'b');
t.is('toggle hides and shows', lay.h, ['a']);
f.homeShow(lay, 'a');
f.homeShow(lay, 'a');
t.is('show is idempotent', lay.h, []);

// the tiles
const now = new Date(2026, 10, 18, 15, 0);                       // Wednesday 18 Nov 2026
const day = (d, h) => new Date(2026, 10, d, h || 9).toISOString();
state = { streak: 4, week: { sets: 21, volume: 5400, by: { Chest: 9, Lats: 0 }, heads: { 'Rear delt': 3 } }, exercises: [{ id: 'e1', name: 'Bench Press' }, { id: 'e2', name: 'Plank' }], records: { 'bench press': [100, 123.4, 800] } };
store.workouts = [{ date: day(17) }, { date: day(2) }, { date: new Date(2026, 9, 30).toISOString() }];
const ctx = () => ({ now });
t.is('streak', f.tileData({ k: 'streak' }, ctx()), { v: '4', l: 'Week streak', go: 'calendar' });
t.is('workouts this month: only November', f.tileData({ k: 'month' }, ctx()).v, '2');
t.is('workouts in all', f.tileData({ k: 'total' }, ctx()).v, '3');
t.is('last workout yesterday', f.tileData({ k: 'since' }, ctx()).v, 'Yesterday');
store.workouts.unshift({ date: day(18, 8) });
t.is('last workout today, whatever the hour', f.tileData({ k: 'since' }, ctx()).v, 'Today');
store.workouts = [{ date: day(14) }];
t.is('last workout four days ago', f.tileData({ k: 'since' }, ctx()).v, '4 days');
store.workouts = [];
t.is('no workout yet: a dash', f.tileData({ k: 'since' }, ctx()).v, '–');
t.is('sets and volume of the week', [f.tileData({ k: 'wsets' }, ctx()).v, f.tileData({ k: 'wvol' }, ctx()).v], ['21', '5400 kg']);
t.is('a muscle without a goal', f.tileData({ k: 'msets', m: 'Chest' }, ctx()), { v: '9', of: '', l: 'Chest sets', go: 'stat-sets' });
store.targets = { Chest: { sets: 16 } };
t.is('and with one', f.tileData({ k: 'msets', m: 'Chest' }, ctx()).of, '16');
t.is('a muscle with no sets this week is 0, not missing', f.tileData({ k: 'msets', m: 'Lats' }, ctx()).v, '0');
t.is('a shoulder head counts too', f.tileData({ k: 'msets', m: 'Rear delt' }, ctx()).v, '3');
t.is('a name that is not a muscle gives no tile (nor an inherited property)', [f.tileData({ k: 'msets', m: 'Nonsense' }, ctx()), f.tileData({ k: 'msets', m: 'constructor' }, ctx()), f.tileData({ k: 'msets', m: '__proto__' }, ctx())], [null, null, null]);
t.is('no weigh-in', f.tileData({ k: 'weight' }, ctx()).v, '–');
store.weights = { '2026-11-10': 82.5 };
t.is('one weigh-in has no change to show', f.tileData({ k: 'weight' }, ctx()), { v: '82.5 kg', l: 'Weight', go: 'weigh' });
store.weights['2026-11-17'] = 82.1;
t.is('two: the change against the one before', f.tileData({ k: 'weight' }, ctx()).l, 'Weight · -0.40 kg');
t.is('the 1RM of an exercise, opening that exercise', f.tileData({ k: 'e1rm', x: 'e1' }, ctx()), { v: '123.4 kg', l: 'Bench Press 1RM', ex: 'e1' });
t.is('an exercise with no record yet: a dash', f.tileData({ k: 'e1rm', x: 'e2' }, ctx()).v, '–');
t.is('a deleted exercise gives no tile', f.tileData({ k: 'e1rm', x: 'gone' }, ctx()), null);
const shared = ctx();
f.tileData({ k: 'wsets' }, shared);
state.week = { sets: 0, volume: 0, by: {}, heads: {} };
t.is('the week is counted once per draw: a second tile reads the same walk', f.tileData({ k: 'wvol' }, shared).v, '5400 kg');
t.done();
