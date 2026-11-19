/* A workout in progress: how its sets are laid out and filled, and what of it is kept
   when it ends. node tests/session.js */
const { slice, suite, bwCode } = require('./lib');
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
const recs = new Function('num', slice('  function epley(w, r)', '  function exKey') + slice('  function setRec(', '  function medal(') + '; return setRec;')(num);
const REC = { Weight: 'Heaviest', Volume: 'Best set', '1RM': 'Est. 1RM' };
const fmtVolume = (kg) => Math.round(kg * 10) / 10 + ' kg';
const totals = new Function('$', 'num', 'logged', 'fmtKg', 'session', 'esc', 'muscleArt', 'setRec', 'REC_NAME', 'fmtVolume',
  bwCode() + slice('  function sessStats()', '  // A typed number moves the medals') + '; return { totals: drawSessTotals, html: sessVolHtml, prs: sessPrHtml, stats: sessStats };');
const run = (exs) => {
  totals((id) => ({ set textContent(v) { shown[id] = v; } }), num, logged, fmtKg, { exercises: exs }, esc, () => '', recs, REC, fmtVolume).totals();
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

const built = (exs) => totals(null, num, logged, fmtKg, { exercises: exs }, esc, () => '', recs, REC, fmtVolume);
const listing = (exs) => built(exs).html();
const prList = (exs) => built(exs).prs();
const rowsOf = (html) => (html.match(/<div class="drow">.*?<\/div>/g) || []).map((r) => r.replace(/<\/span><span[^>]*>/g, ' ').replace(/<[^>]+>/g, ''));
const namesOf = (html) => (html.match(/class="nm">[^<]*/g) || []).map((s) => s.slice(11));
const eg = listing([
  { name: 'Chest fly', sets: [{ label: '01', done: true, weight: '100', reps: '8' }, { label: '02', done: true, weight: '100', reps: '9' }] },
  { name: 'Leg ext', sets: [{ label: '01', weight: '50', reps: '5' }] },
  { name: 'Incline', sets: [{ label: '01', weight: '10', reps: '1' }, { label: '02', done: true, weight: '10', reps: '2' }] },
]);
t.is('the list is per exercise in workout order, ticked sets only', namesOf(eg), ['Chest fly', 'Incline']);
const numsOf = (html) => (html.match(/class="exnum">\d+/g) || []).map((s) => s.slice(14));
t.is('the badge is the exercise\'s place in the workout, not its place in the list', numsOf(eg), ['1', '3']);
t.is('each set shows its number, weight, reps and volume', rowsOf(eg), ['1 100 8 800 kg', '2 100 9 900 kg', '2 10 2 20 kg']);
const odd = listing([{ name: 'A<b>', skipped: true, sets: [{ label: '01', done: true, weight: '5', reps: '5' }] }, { name: 'B<i>', sets: [{ label: 'L2', done: true, weight: '', reps: '5' }] }]);
t.is('a skipped exercise is left out, a name with markup is escaped, a bodyweight set shows a dash', [namesOf(odd), rowsOf(odd)],
  [['B&lt;i>'], ['L2 &ndash; 5 0 kg']]);
t.is('nothing ticked says so', listing([{ name: 'A', sets: [{ label: '01', weight: '5', reps: '5' }] }]).replace(/<[^>]+>/g, ''), 'Nothing ticked yet.');

const prRows = (html) => (html.match(/<div class="drow">.*?<\/div>/g) || []).map((r) => r.replace(/<\/span><span[^>]*>/g, ' ').replace(/<[^>]+>/g, ''));
const bench = { name: 'Bench', sets: [
  { label: '01', done: true, weight: '100', reps: '5', rir: '', prs: ['Weight', 'Volume'], was: { Weight: 90, Volume: 450 } },
  { label: '02', done: true, weight: '105', reps: '5', rir: '', prs: ['Weight'], was: { Weight: 100 } },
  { label: '03', weight: '120', reps: '5', rir: '', prs: ['Weight'], was: { Weight: 105 } }] };
t.is('a record shows its value from the last ticked set and its rise from before the first one',
  prRows(prList([bench])), ['Heaviest 105 kg \u2191 15 kg', 'Best set 500 kg \u2191 50 kg']);
t.is('the records list numbers its exercises the same way',
  numsOf(prList([{ name: 'Row', sets: [] }, bench])), ['2']);
const doorsOf = (html) => (html.match(/data-vex="\d+"/g) || []).map((s) => s.slice(10, -1));
t.is('each card carries the exercise\'s index, so a tap can open it', [doorsOf(eg), doorsOf(prList([{ name: 'Row', sets: [] }, bench]))], [['0', '2'], ['1']]);
t.is('exercises without a ticked record, and skipped ones, are left out; none at all says so',
  [namesOf(prList([bench, { name: 'Row', sets: [{ label: '01', done: true, weight: '5', reps: '5' }] }, Object.assign({}, bench, { name: 'Skipped', skipped: true })])),
   prList([{ name: 'A', sets: [] }]).replace(/<[^>]+>/g, '')], [['Bench'], 'No records yet.']);

const stats = (exs) => built(exs).stats();
t.is('the header row counts a unilateral round once, and only when both sides are ticked, skipped exercises not at all',
  stats([
    { unilateral: true, sets: [{ label: 'R1', done: true, weight: '10', reps: '5' }, { label: 'L1', done: true, weight: '10', reps: '5' }, { label: 'R2', done: true, weight: '10', reps: '5' }, { label: 'L2' }] },
    { sets: [{ label: '01', done: true, weight: '20', reps: '5' }, { label: '02' }] },
    { skipped: true, sets: [{ label: '01', done: true, weight: '99', reps: '9' }] },
  ]), { cnt: 2, all: 4, vol: 250, prs: 0 });

/* last time, for a finished workout: only what came before it, as its own session saw it */
const hist = [
  { date: '2026-05-03T10:00:00Z', exercises: [{ exId: 'x', sets: [{ weight: '70', reps: '8', rir: '1' }, { weight: '70', reps: '7', rir: '' }] }] },
  { date: '2026-05-02T10:00:00Z', exercises: [{ exId: 'x', sets: [{ weight: '60', reps: '8', rir: '2' }, { weight: '60', reps: '8', rir: '2' }, { weight: '55', reps: '9', rir: '' }] }] },
  { date: '2026-05-01T10:00:00Z', exercises: [{ exId: 'x', sets: [{ weight: '50', reps: '8', rir: '3' }] }] },
];
const lastFor = new Function('store', 'cutoffFor', 'afterCut', 'exKey', 'logged', 'plateCount',
  slice('  function lastSetsFor(key, before)', '  // the note written during the last session') + '; return lastSetsFor;')(
  { workouts: hist }, () => 0, () => true, (e) => e.exId, logged, () => 0);
t.is('with no limit it is what the newest sessions had, set by set',
  lastFor('x').map((s) => s.weight), ['70', '70', '55']);
t.is('for the newest workout it is the one before it, and the oldest has nothing before',
  [lastFor('x', Date.parse(hist[0].date)).map((s) => s.weight), lastFor('x', Date.parse(hist[2].date)).length], [['60', '60', '55'], 0]);

/* deleting exercises from the library, one or many: they leave every routine, and the undo brings all of it back */
{
  const lib = { exercises: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], routines: [
    { id: 'r1', items: [{ exId: 'a' }, { exId: 'b' }, { exId: 'c' }] }, { id: 'r2', items: [{ exId: 'c' }] }, { id: 'r3', items: [{ exId: 'b' }] }] };
  // the photo store, answering at once: a is the only exercise with a picture
  const pics = { a: 'blob-a' };
  const del = new Function('store', 'routineById', 'photoForget', 'photoGet', 'photoDel', 'photoPut',
    slice('  function removeExercises(ids)', "  $('ex-delete').addEventListener") + '; return { remove: removeExercises, restore: restoreExercises, using: routinesUsing };')(
    lib, (id) => lib.routines.filter((r) => r.id === id)[0], () => {}, (id, cb) => cb(pics[id] || null), (id) => { delete pics[id]; },
    (id, b, cb) => { pics[id] = b; cb(true); });
  t.is('it counts the routines that hold any of them', [del.using(['a']), del.using(['a', 'c']), del.using(['x'])], [1, 2, 0]);
  const snap = del.remove(['a', 'c']);
  t.is('several go from the library and from every routine at once',
    [lib.exercises.map((x) => x.id), lib.routines.map((r) => r.items.map((i) => i.exId))], [['b'], [['b'], [], ['b']]]);
  t.is('the snapshot keeps what was taken', snap.dead.map((x) => x.id).sort(), ['a', 'c']);
  t.is('a deleted exercise\'s photo leaves the store but waits in the snapshot', [Object.keys(pics), snap.photos.a], [[], 'blob-a']);
  del.restore(snap);
  t.is('undo puts the photo back', pics.a, 'blob-a');
  t.is('undo puts the exercises and the routines\' items back',
    [lib.exercises.map((x) => x.id).sort(), lib.routines.map((r) => r.items.map((i) => i.exId))], [['a', 'b', 'c'], [['a', 'b', 'c'], ['c'], ['b']]]);
  t.is('emptying the library marks it wiped, so the other devices drop their copies too', [lib.wiped === undefined, (del.remove(['a', 'b', 'c']), typeof lib.wiped)], [true, 'number']);
}

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
  'var summaryW;' + bwCode() + slice('  function finishSession(seconds)', '  /* --- what the session came to') +
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
