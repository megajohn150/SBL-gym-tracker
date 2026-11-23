/* Rekordy w profilu i leaderboard: po jednym wierszu na ćwiczenie (po nazwie),
   remisy dzielą miejsce, reset ćwiczenia ucina historię. */
const { slice, suite, bwCode } = require('./lib');

const code = slice('  function nameKey(s)', '  function postRow(w)');
const board = slice('  // everybody who has the exercise, best first', '  function lbCard');
const t = suite('compare');

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const set = (weight, reps, rir) => ({ weight: String(weight), reps: String(reps), rir: rir == null ? '' : String(rir) });
const store = {
  exercises: [{ id: 'a', name: 'Bench Press (Barbell)' }, { id: 'b', name: 'Squat', resetAt: '2026-02-01T00:00:00Z' }],
  workouts: [
    { date: '2026-01-10T10:00:00Z', exercises: [
      { exId: 'a', name: 'old name', sets: [set(60, 10), set(80, 5)] },
      { exId: 'b', name: 'Squat', sets: [set(200, 1)] } ] },
    { date: '2026-03-10T10:00:00Z', exercises: [
      { exId: 'a', name: 'Bench Press (Barbell)', sets: [set(70, 8, 2), set(0, 12)] },
      { exId: 'b', name: 'Squat', sets: [set(100, 5)] } ] }
  ]
};
const store_ = store;
const fn = new Function('store', 'num', 'logged', 'epley', 'effReps', 'cutMap', 'afterCut', 'exKey', 'byId',
  bwCode() + code.slice(code.indexOf('function nameKey')) + '; return { myRecords: myRecords, nameKey: nameKey };');
const cuts = { b: new Date('2026-02-01T00:00:00Z').getTime() };
const epley = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
const api = fn(store_, num, (st) => num(st.reps) > 0, epley, (st) => num(st.reps) + num(st.rir),
  () => cuts, (w, c) => !c || new Date(w.date).getTime() >= c, (e) => e.exId || ('name:' + e.name),
  (id) => store_.exercises.filter((x) => x.id === id)[0] || null);

const r = api.myRecords();
t.is('one key per exercise, by its current name', Object.keys(r), ['bench press (barbell)', 'squat']);
t.is('heaviest, est. 1RM, best set (RIR counts as reps in the tank)', r['bench press (barbell)'], [80, 93.3, 600, 60, 10, 0]);
t.is('a reset drops what came before it', r['squat'], [100, 116.7, 500, 100, 5, 0]);

const rows = new Function('store', 'myRecords', 'recOf', 'lbFr', board + '; return board;')(
  store_, () => ({ x: [100, 0, 0] }), (p, k) => p.stats.records[k], {
    f1: { stats: { records: { x: [100, 0, 0] } } },
    f2: { stats: { records: { x: [60, 0, 0] } } },
    f3: { stats: { records: {} } }
  });
const b = rows('x');
t.is('tie shares first place, next is third, no record means not listed',
  b.map((x) => [x.you ? 'you' : x.id, x.rank]), [['you', 1], ['f1', 1], ['f2', 3]]);
t.done();
