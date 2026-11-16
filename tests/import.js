/* A backup file that is empty, the wrong shape, cut short or hand-edited must not reach the log
   as it is: bad workouts are left out and counted, the rest is made safe. node tests/import.js */
const { slice, suite, planClean } = require('./lib');
const t = suite('import');

const code = planClean() + slice('  function cleanWorkouts(', '  function importDone(') + slice('  function postOk(', '  function workoutCard(');
let n = 0;
const nameKey = (s) => String(s).trim().toLowerCase();
const migrate = (r) => r;
const api = new Function('uid', 'pad2', 'nameKey', 'migrate', code + '; return { clean: cleanWorkouts, ok: postOk, ex: cleanExercises, merge: mergeImport };')(
  () => 'new' + ++n, (v) => (v < 10 ? '0' + v : String(v)), nameKey, migrate);

const W = (extra) => Object.assign({ id: 'a', name: 'Push', date: new Date(2026, 0, 5).toISOString(), seconds: 3000,
  exercises: [{ name: 'Bench', sets: [{ label: '01', weight: '80', reps: '8', rir: '2' }] }] }, extra);

t.is('an empty list is nothing and nothing is lost', api.clean([]), { list: [], skipped: 0 });
t.is('junk entries are skipped, not thrown on', api.clean([null, 5, 'x', [], {}]).skipped, 5);
t.is('a workout without a readable date is skipped',
  [api.clean([W({ date: 'soon' })]).skipped, api.clean([W({ date: undefined })]).skipped], [1, 1]);
t.is('exercises that are not a list are skipped', api.clean([W({ exercises: 'Bench' })]).skipped, 1);
t.is('a workout whose every exercise is unreadable is skipped, an empty one is kept',
  [api.clean([W({ exercises: [{ name: 'x' }, null] })]).skipped, api.clean([W({ exercises: [] })]).list.length], [1, 1]);
t.is('the same id twice keeps the first', api.clean([W({}), W({ name: 'Again' })]).list.map((w) => w.name), ['Push']);
const nid = api.clean([W({ id: undefined }), W({ id: '' })]).list.map((w) => w.id);
t.is('a missing id gets a new one, each its own', nid, ['new1', 'new2']);
const fixed = api.clean([W({ exercises: [{ name: 7, sets: [{ weight: 80, reps: 8, rir: null }, { label: 3, weight: null }] }] })]).list[0].exercises[0];
t.is('numbers become text and a missing label is numbered',
  [fixed.name, fixed.sets[0], fixed.sets[1]],
  ['7', { weight: '80', reps: '8', rir: '', label: '01' }, { label: '3', weight: '', reps: '', rir: '' }]);
t.is('what comes out can be drawn', api.clean([W({}), W({ id: 'b' })]).list.every(api.ok), true);
const src = W({ exercises: [{ name: 'Bench', sets: [{ weight: 80, reps: 8 }] }] });
api.clean([src]);
t.is('the file\'s own object is left as it was', src.exercises[0].sets[0], { weight: 80, reps: 8 });
t.is('seconds and extra fields: junk becomes zero, the rest travels',
  [api.clean([W({ seconds: 'x', records: 3 })]).list[0].seconds, api.clean([W({ records: 3 })]).list[0].records], [0, 3]);
t.is('an exercise needs a text id and a name, the rest is counted and dropped',
  api.ex([{ id: 'a', name: 'Bench' }, { id: 'b' }, { name: 'x' }, { id: 5, name: 'y' }, null, 'z']),
  { list: [{ id: 'a', name: 'Bench' }], skipped: 5 });

// merge: the file is added around what is here
const day = (d) => new Date(2026, 0, d, 18).toISOString();
const mk = () => ({
  exercises: [{ id: 'e1', name: 'Bench' }], routines: [{ id: 'r1', name: 'Mine', items: [{ exId: 'e1' }] }],
  workouts: [{ id: 'w2', date: day(7), exercises: [] }, { id: 'w1', date: day(5), exercises: [] }],
  gone: ['wdead'], targets: { Chest: { sets: 10 } }, injuries: [{ id: 'i1', name: 'knee' }]
});
const wk = (id, d, exId) => ({ id, name: 'W', date: day(d), seconds: 0, exercises: [{ name: 'x', exId, sets: [] }] });
const st = mk();
const res = api.merge(st,
  { routines: [{ id: 'r1', name: 'Theirs', items: [] }, { id: 'r2', name: 'New', items: [{ exId: 'f1' }, { exId: 'f2' }] }],
    targets: { Chest: { sets: 99 }, Legs: { sets: 8 } }, injuries: [{ id: 'i1', name: 'other' }, { id: 'i2', name: 'elbow' }] },
  [{ id: 'f1', name: ' bench ' }, { id: 'f2', name: 'Squat' }, { id: 'e1', name: 'Bench again' }],
  [wk('w1', 9, 'f1'), wk('a', 5, 'f1'), wk('wdead', 8, 'f1'), wk('n', 10, 'f2')]);
t.is('merge: same id or same start time is the same workout, the rest is added',
  [res.workouts, res.same], [2, 2]);
t.is('a workout deleted here comes back under a new id, newest first',
  [st.workouts.map((w) => w.id).filter((id) => id !== 'wdead' && !id.startsWith('new')), st.workouts[1].id.startsWith('new'), st.workouts.length],
  [['n', 'w2', 'w1'], true, 4]);
t.is('an exercise with the same name is the local one: the file\'s workouts and routines point at it',
  [st.workouts[1].exercises[0].exId, st.routines[1].items.map((i) => i.exId), st.exercises.map((x) => x.name)],
  ['e1', ['e1', 'f2'], ['Bench', 'Squat']]);
t.is('on a clash this device wins, new routines, targets and injuries come in',
  [st.routines.map((r) => r.name), st.targets, st.injuries.map((i) => i.name)],
  [['Mine', 'New'], { Chest: { sets: 10 }, Legs: { sets: 8 } }, ['knee', 'elbow']]);
t.is('the counts say what was added', [res.exercises, res.routines], [1, 1]);
const none = api.merge(mk(), {}, [], []);
t.is('an empty file adds nothing, whatever it lacks', none, { workouts: 0, same: 0, exercises: 0, routines: 0 });
t.done();
