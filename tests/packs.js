/* Starter packs: what an import brings, and what it leaves alone. Exercises come once per name,
   a routine that is already there is skipped, one with other exercises gets the next free number.
   node tests/packs.js */
const { slice, suite } = require('./lib');
const t = suite('packs');

const block = slice('  // Starter packs: the exercises', '  // the starter packs window');
const nameKey = (s) => String(s).trim().toLowerCase();
const deriveCode = new Function(slice('  function deriveCode(name)', '  function codeOf') + '; return deriveCode;')();
const cells = slice('  var MUSCLE_CELL = {', '  // Measured centres');
const muscles = Object.keys(new Function(cells + '; return MUSCLE_CELL;')());

let n = 0, saves = 0, store;
const fresh = () => { store = { exercises: [], routines: [] }; n = 0; saves = 0; };
const api = () => new Function('store', 'uid', 'nameKey', 'deriveCode', 'saveStore', 'routineName',
  block + '; return { PACKS: PACKS, importPack: importPack };')(store, () => 'u' + (++n), nameKey, deriveCode, () => { saves++; },
  new Function('store', slice('  function routineName(base)', '  function routineFromWorkout') + '; return routineName;')(store));
const all = (k) => ({ SBL: ['Anterior', 'Posterior', 'Full Body'], BRO: ['Push', 'Pull', 'Legs'] })[k];

/* the data itself */
fresh();
const { PACKS, importPack } = api();
Object.keys(PACKS).forEach((k) => {
  const p = PACKS[k], names = p.exercises.map((x) => x.name);
  t.is(k + ': names are unique, muscles are real, a shoulder has its head', [
    new Set(names.map(nameKey)).size === names.length,
    p.exercises.every((x) => muscles.indexOf(x.muscle) > -1),
    p.exercises.filter((x) => x.muscle === 'Shoulders').every((x) => x.head)], [true, true, true]);
  t.is(k + ': every routine item is an exercise of the pack, with 1 to 12 sets, and every exercise is used',
    [p.routines.every((r) => r.items.every((i) => names.indexOf(i[0]) > -1 && i[1] >= 1 && i[1] <= 12)),
     names.every((nm) => p.routines.some((r) => r.items.some((i) => i[0] === nm)))], [true, true]);
});

/* into an empty library */
fresh();
let a = api();
let out = a.importPack('bro', ['Push', 'Pull', 'Legs']);
t.is('everything comes into an empty library', [out.ex, out.rt, out.skipped, store.exercises.length, store.routines.length], [17, 3, 0, 17, 3]);
t.is('a routine item points at a real exercise; a unilateral one has a side, a standard one none', [
  store.routines.every((r) => r.items.every((i) => store.exercises.some((x) => x.id === i.exId))),
  store.routines[1].items.map((i) => i.side)], [true, [null, null, 'R', null, null, null]]);
t.is('a code is made for an exercise that has none', store.exercises[0].code, 'BPB');

/* the same again, and a library that already holds some */
out = a.importPack('bro', ['Push', 'Pull', 'Legs']);
t.is('the same import twice changes nothing', [out.ex, out.rt, out.skipped, store.exercises.length, store.routines.length], [0, 0, 3, 17, 3]);

fresh();
store.exercises.push({ id: 'mine', name: 'lat pulldown (cable)', muscle: 'Lats', unilateral: false });
a = api();
out = a.importPack('bro', ['Pull']);
const pull = store.routines[0];
t.is('an exercise with the same name, in any case, is not added again, and the routine uses it',
  [out.ex, store.exercises.filter((x) => nameKey(x.name) === 'lat pulldown (cable)').length, pull.items[0].exId], [16, 1, 'mine']);

/* routines: same name, same or other exercises */
fresh();
store.exercises.push({ id: 'q', name: 'Squat (Barbell)', muscle: 'Quads' });
store.routines.push({ id: 'r', name: 'LEGS', items: [{ exId: 'q', sets: 3, reps: '5', side: null }] });
a = api();
out = a.importPack('bro', ['Legs']);
t.is('the same name with other exercises becomes "Legs 2"', [out.rt, out.renamed, store.routines.map((r) => r.name)], [1, 1, ['LEGS', 'Legs 2']]);
out = a.importPack('bro', ['Legs']);
t.is('and importing it again does not make a "Legs 3"', [out.rt, out.skipped, store.routines.length], [0, 1, 2]);
store.routines[1].items.reverse();
store.routines[1].items.forEach((i) => { i.sets = 1; });
out = a.importPack('bro', ['Legs']);
t.is('same exercises in another order or with other sets still count as the same routine', [out.rt, out.skipped], [0, 1]);
store.routines[1].items.pop();
out = a.importPack('bro', ['Legs']);
t.is('one exercise less is another routine: "Legs 3"', [out.rt, store.routines.map((r) => r.name)], [1, ['LEGS', 'Legs 2', 'Legs 3']]);

/* only what was asked, and a library that disagrees about unilateral */
fresh();
a = api();
out = a.importPack('sbl', []);
t.is('with no routine asked for, only the exercises come', [out.ex, out.rt, store.routines.length, saves], [18, 0, 0, 1]);
out = a.importPack('sbl', ['Posterior']);
t.is('one routine of three', [out.rt, store.routines.map((r) => r.name)], [1, ['Posterior']]);
fresh();
a = api();
a.importPack('sbl', []);
out = a.importPack('bro', ['Legs']);
const legs = store.routines[0];
t.is('a pack exercise already in the library as unilateral gets a side in the routine',
  legs.items[3].side, 'R');
t.is('nothing to add is not a save', (fresh(), a = api(), a.importPack('nope', ['x']), saves), 0);
t.done();
