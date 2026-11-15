/* The numbers behind every screen: what counts as a set, what a record is, when a reset
   starts the count over, and how they are written out. node tests/records.js */
const { slice, suite } = require('./lib');
const t = suite('records');

const code = slice("  var MONTHS = ['Jan'", '  function finishSession(seconds)');
const stats = slice('  function monday(d) {', '  function byGroup(by)');
const cells = slice('  var MUSCLE_CELL = {', '  // Measured centres');
const store = { exercises: [{ id: 'a', name: 'Bench' }, { id: 's', name: 'Raise', head: 'Rear delt' }], workouts: [] };
const byId = (id) => store.exercises.filter((x) => x.id === id)[0] || null;
const api = new Function('store', 'byId', 'pad2', code + cells + stats +
  '; return { num: num, logged: logged, fmtDuration: fmtDuration, fmtKg: fmtKg, fmtVolume: fmtVolume, countSets: countSets,' +
  ' workoutTotals: workoutTotals, muscleSplit: muscleSplit, epley: epley, recompute: recomputeRecords, bestsFor: bestsFor,' +
  ' livePrs: livePrs, statsFor: statsFor, weekBoard: weekBoard };')(store, byId, (n) => (n < 10 ? '0' + n : String(n)));

const set = (weight, reps, rir, label) => ({ label: label || '01', weight: String(weight), reps: String(reps), rir: rir == null ? '' : String(rir) });
const W = (id, day, sets, extra) => ({ id, date: new Date(2026, 0, day, 18).toISOString(), seconds: 3600,
  exercises: [Object.assign({ exId: 'a', name: 'Bench', muscle: 'Chest', sets }, extra)] });

t.is('a comma is a decimal point, rubbish is zero', [api.num('12,5'), api.num('x'), api.num('')], [12.5, 0, 0]);
t.is('a set counts once it has reps, weight or not', [api.logged(set('', 8)), api.logged(set(80, ''))], [true, false]);
t.is('59:59 rounds up into the next hour', [api.fmtDuration(3599), api.fmtDuration(90), api.fmtDuration(7260)], ['1h 00m', '2m', '2h 01m']);
t.is('volume is grouped in thousands with one decimal', api.fmtVolume(1234.56), '1 234.6 kg');
t.is('from ten tonnes it is written in thousands', [api.fmtKg(9999), api.fmtKg(144488.5)], ['9 999 kg', '144.5k kg']);
t.is('a unilateral round is one set, whichever sides were logged',
  api.countSets({ unilateral: true, sets: [set(10, 8, 0, 'R1'), set(10, 8, 0, 'L1'), set(10, 6, 0, 'R2'), set(10, '', 0, 'L2')] }), 2);
t.is('totals leave out sets with no reps', api.workoutTotals(W('w', 1, [set(100, 5), set(100, ''), set(50, 10)])),
  { sets: 2, volume: 1000, reps: 15, exercises: 1 });

/* records, oldest first */
store.workouts = [
  W('w3', 15, [set(100, 10)]),
  W('w1', 1, [set(100, 5)]),
  W('w2', 8, [set(105, 5), set(110, 5)])
];
api.recompute();
const by = (id) => store.workouts.filter((w) => w.id === id)[0];
t.is('the first time only sets the bar', [by('w1').records, by('w1').exercises[0].sets[0].prs], [0, []]);
t.is('a heavier set breaks all three, and says what stood before',
  [by('w2').exercises[0].sets[0].prs, by('w2').exercises[0].sets[0].was.Weight], [['Weight', '1RM', 'Volume'], 100]);
t.is('two sets breaking the same record are one medal each kind', by('w2').records, 3);
t.is('more reps at less weight: 1RM and volume, not weight', by('w3').exercises[0].sets[0].prs, ['1RM', 'Volume']);
t.is('reps left in the tank count towards the estimate', api.epley(100, 5 + 1) > api.epley(100, 5), true);

store.exercises[0].resetAt = new Date(2026, 0, 10).toISOString();
api.recompute();
t.is('a reset stops the old sessions counting', [by('w1').records, by('w2').records], [0, 0]);
t.is('and the first session after it sets the bar again', by('w3').records, 0);
t.is('the bests read from the reset on', api.bestsFor('a').weight, 100);
delete store.exercises[0].resetAt;

store.workouts.push(W('w4', 20, [set(500, 5)], { skipped: true }));
api.recompute();
t.is('a skipped exercise sets no record', [by('w4').records, api.bestsFor('a').weight], [0, 110]);
store.workouts.pop();

const live = { exId: 'a', sets: [Object.assign(set(120, 5), { done: false }), Object.assign(set(120, 5), { done: true })] };
api.livePrs(live);
t.is('in a running workout only a ticked set earns a medal', live.sets.map((s) => s.prs), [[], ['Weight', '1RM']]);

/* a stretch of time, muscle by muscle */
const from = new Date(2026, 0, 5), to = new Date(2026, 0, 12);
store.workouts = [
  { date: new Date(2026, 0, 5, 0, 0).toISOString(), seconds: 600, exercises: [{ exId: 'a', muscle: 'Chest', sets: [set(100, 5), set(100, 5)] }] },
  { date: new Date(2026, 0, 12, 0, 0).toISOString(), seconds: 600, exercises: [{ exId: 'a', muscle: 'Chest', sets: [set(100, 5)] }] },
  { date: new Date(2026, 0, 7, 9).toISOString(), seconds: 900, exercises: [
    { exId: 's', muscle: 'Shoulders', sets: [set(10, 12)] }, { exId: 'zz', muscle: 'Made up', sets: [set(1, 1)] }] }
];
const s = api.statsFor(from, to);
t.is('the span is half open: Monday 00:00 is in, the next Monday is out', [s.workouts, s.by.Chest, s.seconds], [2, 2, 1500]);
t.is('a shoulder set is counted under its head', [s.by.Shoulders, s.heads['Rear delt'], s.hdays['Rear delt']], [1, 1, 1]);
t.is('a muscle the app does not know is Other, not lost', [s.by.Other, s.total], [1, 4]);
t.is('somebody else\'s list is counted the same way', api.statsFor(from, to, [store.workouts[0]]).sets, 2);
// Wednesday 7 Jan 2026: the week runs Mon 5 to Sun 11, so Monday 12 and the Sunday before are out
const post = (by, day, n) => ({ by, date: new Date(2026, 0, day, 18).toISOString(),
  exercises: [{ exId: 'a', muscle: 'Chest', sets: Array.from({ length: n }, () => set(100, 5)) }] });
const board = api.weekBoard([post('f1', 5, 3), post('f1', 6, 3), post('f2', 4, 9), post('f2', 12, 9), post('f3', 7, 5)],
  [post('me', 7, 2)], ['f1', 'f2', 'f3', 'f4'], new Date(2026, 0, 7, 12));
t.is('the board counts from Monday, ranks by workouts, and keeps a silent friend at zero',
  board.map((r) => [r.id, r.workouts, r.sets]),
  [['f1', 2, 6], ['f3', 1, 5], ['me', 1, 2], ['f2', 0, 0], ['f4', 0, 0]]);
t.is('volume is weight times reps', board[0].volume, 6 * 500);
t.is('the split is in whole percent, biggest first', api.muscleSplit({ exercises: [
  { muscle: 'Chest', sets: [set(1, 1), set(1, 1), set(1, 1)] }, { muscle: 'Biceps', sets: [set(1, 1)] }] }),
  [{ muscle: 'Chest', pct: 75 }, { muscle: 'Biceps', pct: 25 }]);
t.done();
