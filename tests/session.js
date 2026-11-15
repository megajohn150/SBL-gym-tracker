/* A workout in progress: how its sets are laid out and filled, and what of it is kept
   when it ends. node tests/session.js */
const { slice, suite } = require('./lib');
const t = suite('session');
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const pad2 = (n) => (n < 10 ? '0' + n : String(n));
const s = new Function('num', 'pad2', slice('  function blankSet(label)', '  function sessionSeconds()') +
  '; return { fillFrom: fillFrom, setFull: setFull, exDone: exDone, delta: delta, relabel: relabel, buildSets: buildSets };')(num, pad2);

t.is('a standard exercise numbers its sets', s.buildSets(3, false).map((x) => x.label), ['01', '02', '03']);
t.is('a unilateral one is a row per side, starting where the routine says',
  s.buildSets(2, true, 'L').map((x) => x.label), ['L1', 'R1', 'L2', 'R2']);
const uni = { unilateral: true, side: 'R', sets: s.buildSets(3, true, 'R') };
uni.sets.splice(2, 2);
s.relabel(uni);
t.is('deleting a round renumbers the rest', uni.sets.map((x) => x.label), ['R1', 'L1', 'R2', 'L2']);

const full = { label: '01', weight: '80', reps: '8', rir: '1' };
t.is('a set is full once all three are in; a bodyweight set never is', [s.setFull(full), s.setFull({ weight: '', reps: '8', rir: '1' })], [true, false]);
t.is('an exercise is done when every set is ticked, and never when it has none',
  [s.exDone({ sets: [{ done: true }, { done: true }] }), s.exDone({ sets: [{ done: true }, {}] }), s.exDone({ sets: [] })], [true, false, false]);

const ex = { unilateral: false, prev: [{ weight: '70', reps: '8', rir: '2' }], sets: [full, { label: '02', weight: '', reps: '', rir: '' }] };
t.is('a tap fills from the same set last time', s.fillFrom(ex, 0).weight, '70');
t.is('or, with no last time, from the set above', s.fillFrom(ex, 1), full);
const side = { unilateral: true, prev: [], sets: [Object.assign({}, full, { label: 'R1' }), { label: 'L1', weight: '60', reps: '8', rir: '' }, { label: 'R2', weight: '', reps: '', rir: '' }] };
t.is('one side fills from the same side, not from the row above', s.fillFrom(side, 2).label, 'R1');
t.is('the step since last time: up, down, none, and F is zero in reserve',
  [s.delta('82.5', '80'), s.delta('8', '10'), s.delta('', '10'), s.delta('F', '2', true)],
  ['<i class="delta up">+2.5</i>', '<i class="delta down">-2</i>', '', '<i class="delta down">-2</i>']);

const unpause = new Function(slice('  function unpause(s)', '  /* =========================================================\n     CLOUD') + '; return unpause;')();
const old = unpause({ startedAt: Date.now() - 3600e3, pausedAt: Date.now() - 600e3 });
t.is('a session paused by an older version resumes with its clock where it stopped',
  [old.pausedAt, Math.round((Date.now() - old.startedAt) / 60e3)], [null, 50]);
t.is('one that was never paused is left alone', unpause({ startedAt: 5 }).startedAt, 5);

/* the numbers under the header: ticked sets only, a record counted once per category per exercise */
const shown = {};
const fmtKg = (kg) => kg + ' kg';
const logged = (st) => num(st.reps) > 0;
const esc = (s) => String(s).replace(/</g, '&lt;');
const totals = new Function('$', 'num', 'logged', 'fmtKg', 'session', 'esc',
  slice('  function drawSessTotals()', '  // A typed number moves the medals') + '; return { totals: drawSessTotals, html: sessVolHtml };');
const run = (exs) => {
  totals((id) => ({ set textContent(v) { shown[id] = v; } }), num, logged, fmtKg, { exercises: exs }, esc).totals();
  return [shown['sess-vol'], shown['sess-pr-n']];
};
t.is('volume and records count only ticked, logged sets', run([
  { sets: [{ done: true, weight: '100', reps: '5', prs: ['Weight', '1RM'] }, { weight: '120', reps: '5', prs: ['Weight'] }, { done: true, weight: '', reps: '' }] },
]), ['500 kg', 2]);
t.is('the same record twice in one exercise is one, in two exercises it is two', run([
  { sets: [{ done: true, weight: '50', reps: '5', prs: ['Weight'] }, { done: true, weight: '60', reps: '5', prs: ['Weight'] }] },
  { sets: [{ done: true, weight: '10', reps: '10', prs: ['Weight'] }] },
]), ['650 kg', 2]);
t.is('a skipped exercise adds nothing', run([{ skipped: true, sets: [{ done: true, weight: '90', reps: '5', prs: ['Volume'] }] }]), ['0 kg', 0]);
t.is('a set whose prs is not a list is ignored', run([{ sets: [{ done: true, weight: '20', reps: '5', prs: 'x' }] }]), ['100 kg', 0]);

const listing = (exs) => totals(null, num, logged, fmtKg, { exercises: exs }, esc).html();
const text = (html) => html.replace(/<\/span><span>/g, ' ').replace(/<\/(div|p)>/g, '|').replace(/<[^>]+>/g, '').replace(/\|$/, '');
t.is('the list is per exercise in workout order, ticked sets only, each with its volume', text(listing([
  { name: 'Chest fly', sets: [{ label: '01', done: true, weight: '100', reps: '8' }, { label: '02', done: true, weight: '100', reps: '9' }] },
  { name: 'Leg ext', sets: [{ label: '01', weight: '50', reps: '5' }] },
  { name: 'Incline', sets: [{ label: '01', weight: '10', reps: '1' }, { label: '02', done: true, weight: '10', reps: '2' }] },
])), 'Chest fly|1 800 kg|2 900 kg|Incline|2 20 kg');
t.is('a set keeps its own number, a skipped exercise and a name with markup are handled',
  text(listing([{ name: 'A<b>', skipped: true, sets: [{ label: '01', done: true, weight: '5', reps: '5' }] }, { name: 'B<i>', sets: [{ label: 'L2', done: true, weight: '5', reps: '5' }] }])),
  'B&lt;i>|L2 25 kg');
t.is('nothing ticked says so', text(listing([{ name: 'A', sets: [{ label: '01', weight: '5', reps: '5' }] }])), 'Nothing ticked yet.');

/* ending it */
const store = { workouts: [{ id: 'older' }] };
const started = new Date(2026, 4, 1, 17, 30).getTime();
const running = { name: 'Push', startedAt: started, routineId: 'r1', note: '  good  ', idx: 0, exercises: [
  { exId: 'a', name: 'Bench', muscle: 'Chest', unilateral: false, snote: ' heavy ', sets: [
    { label: '01', weight: '80', reps: '8', rir: '1', done: true, plate: 2 }, { label: '02', weight: '80', reps: '', rir: '' }] },
  { exId: 'b', name: 'Fly', muscle: 'Chest', unilateral: false, sets: [{ label: '01', weight: '20', reps: '', rir: '' }] },
  { exId: 'c', name: 'Dips', muscle: 'Triceps', unilateral: false, skipped: true, sets: [{ label: '01', weight: '', reps: '9', rir: '' }] }] };
const calls = [];
const noop = (name) => () => { calls.push(name); };
const end = new Function('store', 'session', 'uid', 'sessionSeconds', 'logged', 'plateCount', 'recomputeRecords', 'saveStore',
  'saveSession', 'stopRest', 'goTab', 'drawHome', 'push', 'drawSummary',
  'var summaryW;' + slice('  function finishSession(seconds)', '  /* --- what the session came to') +
  '; finishSession(1234); return { session: session, summary: summaryW };')(
  store, running, () => 'new', () => 99, (st) => num(st.reps) > 0, (st) => (st.plate ? (typeof st.plate === 'number' ? st.plate : 1) : 0),
  noop('records'), noop('saveStore'), noop('saveSession'), noop('rest'), noop('tab'), noop('home'), noop('push'), noop('summary'));
const w = store.workouts[0];
t.is('the workout goes to the top of the log and the session is over', [store.workouts.map((x) => x.id), end.session], [['new', 'older'], null]);
t.is('it is dated when it began, with the time it was given', [w.date, w.seconds, w.routineId], [new Date(started).toISOString(), 1234, 'r1']);
t.is('only logged sets are kept, an empty exercise goes, a skipped one stays without sets',
  w.exercises.map((e) => [e.name, e.sets.length, !!e.skipped]), [['Bench', 1, false], ['Dips', 0, true]]);
t.is('a set keeps its numbers and plates, not its tick', w.exercises[0].sets[0], { label: '01', weight: '80', reps: '8', rir: '1', plate: 2 });
t.is('notes are trimmed', [w.note, w.exercises[0].note], ['good', 'heavy']);
t.is('records are counted before it is saved, and the summary gets the workout',
  [calls.indexOf('records') < calls.indexOf('saveStore'), end.summary === w], [true, true]);
t.done();
