/* A backup file that is empty, the wrong shape, cut short or hand-edited must not reach the log
   as it is: bad workouts are left out and counted, the rest is made safe. node tests/import.js */
const { slice, suite } = require('./lib');
const t = suite('import');

const code = slice('  function cleanWorkouts(', '  function importData(') + slice('  function postOk(', '  function workoutCard(');
let n = 0;
const api = new Function('uid', 'pad2', code + '; return { clean: cleanWorkouts, ok: postOk };')(
  () => 'new' + ++n, (v) => (v < 10 ? '0' + v : String(v)));

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
t.done();
