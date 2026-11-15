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
/* ---- every situation below runs on the shipped text, nothing is copied ---- */
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const optionsOf = (id) => {
  const m = src.match(new RegExp('<select id="' + id + '">([\\s\\S]*?)</select>'));
  return (m[1].match(/<option(?: value="[^"]*")?>([^<]+)<\/option>/g) || []).map((o) => o.replace(/<[^>]+>/g, ''));
};
const formMuscles = optionsOf('ex-muscle'), formHeads = optionsOf('ex-head').filter((o) => o !== 'Pick one');
const { cleanSets, cleanStep } = new Function(slice('  function cleanSets(v)', '  function fixCues()') + '; return { cleanSets: cleanSets, cleanStep: cleanStep };')();

fresh();
const D = api().PACKS;
Object.keys(D).forEach((k) => {
  const ex = D[k].exercises, by = {};
  ex.forEach((x) => { by[x.name] = x; });
  t.is(k + ': muscles and heads are exactly what the exercise form offers, and only a shoulder has a head',
    [ex.every((x) => formMuscles.indexOf(x.muscle) > -1), ex.every((x) => x.muscle === 'Shoulders' ? formHeads.indexOf(x.head) > -1 : !x.head)], [true, true]);
  t.is(k + ': a given code is upper case and up to seven characters; the one derived is too',
    ex.every((x) => { const c = (x.code || deriveCode(x.name)); return c && c.length <= 7 && c === c.toUpperCase(); }), true);
  t.is(k + ': a step survives the app\'s own cleaning, a cue fits the form, sets and reps are clean',
    [ex.every((x) => !x.step || (cleanStep(x.step) === x.step && Math.round(x.step * 100) / 100 === x.step)),
     ex.every((x) => !x.cue || x.cue.length <= 120),
     D[k].routines.every((r) => r.items.every((i) => cleanSets(i[1]) === i[1] && typeof i[2] === 'string' && i[2].length > 0))], [true, true, true]);
  t.is(k + ': a standard exercise never has a side in a routine, a unilateral one has L, R or none',
    D[k].routines.every((r) => r.items.every((i) => by[i[0]].unilateral ? [null, 'L', 'R'].indexOf(i[3]) > -1 : i[3] === null)), true);
  t.is(k + ': no routine lists an exercise twice, and routine names are unique',
    [D[k].routines.every((r) => new Set(r.items.map((i) => i[0])).size === r.items.length),
     new Set(D[k].routines.map((r) => nameKey(r.name))).size === D[k].routines.length], [true, true]);
});
t.is('the packs hold 18 and 17 exercises, in 3 and 3 routines of 9, 9, 15 and 5, 6, 6 exercises',
  [D.sbl.exercises.length, D.bro.exercises.length, D.sbl.routines.map((r) => r.items.length), D.bro.routines.map((r) => r.items.length)],
  [18, 17, [9, 9, 15], [5, 6, 6]]);

/* SBL into an empty library; both packs in either order; the same again and again */
const ids = () => store.exercises.map((x) => x.id).concat(store.routines.map((r) => r.id));
fresh();
let X = api();
out = X.importPack('sbl', ['Anterior', 'Posterior', 'Full Body']);
t.is('SBL into an empty library: 18 exercises, 3 routines, sizes as in the pack', [out.ex, out.rt, store.routines.map((r) => r.items.length)], [18, 3, [9, 9, 15]]);
t.is('every id is unique across exercises and routines', new Set(ids()).size === ids().length, true);
t.is('the unilateral exercises of SBL keep their sides', store.routines[0].items.filter((i) => i.side).map((i) => i.side), ['L', 'R', 'R']);

const both = (first, second) => {
  fresh(); const A = api();
  A.importPack(first, all(first === 'sbl' ? 'SBL' : 'BRO'));
  const o2 = A.importPack(second, all(second === 'sbl' ? 'SBL' : 'BRO'));
  return { o2: o2, A: A };
};
let r2 = both('bro', 'sbl');
t.is('Bro, then SBL: 14 new exercises (four are shared), 3 more routines, 31 and 6 in all', [r2.o2.ex, r2.o2.rt, store.exercises.length, store.routines.length], [14, 3, 31, 6]);
const lext = store.exercises.filter((x) => x.name === 'Leg Extension (Machine)');
t.is('the shared Leg Extension stays the standard one Bro made, so SBL\'s routine gives it no side',
  [lext.length, lext[0].unilateral, store.routines[3].items[1].side, store.routines[5].items[3].side], [1, false, null, null]);
r2 = both('sbl', 'bro');
t.is('SBL, then Bro: 13 new exercises, 31 and 6 in all, names unique', [r2.o2.ex, store.exercises.length, store.routines.length,
  new Set(store.exercises.map((x) => nameKey(x.name))).size], [13, 31, 6, 31]);
t.is('and Bro\'s Legs gives the unilateral Leg Extension SBL made a side', store.routines[5].items[3].side, 'R');
fresh(); X = api();
['sbl', 'bro', 'sbl', 'bro', 'bro', 'sbl'].forEach((k) => X.importPack(k, all(k === 'sbl' ? 'SBL' : 'BRO')));
t.is('packs in any order, again and again, settle at 31 exercises and 6 routines', [store.exercises.length, store.routines.length], [31, 6]);

/* names: case, spaces, and an exercise that is the same by name but not by anything else */
fresh();
store.exercises.push({ id: 'x1', name: '  LAT PULLDOWN (cable)  ', muscle: 'Back', head: '', cue: 'keep', unilateral: true, resetAt: '2026-01-01', step: 9 });
store.exercises.push({ id: 'x2', name: 'Squat (Barbell)', muscle: 'Glutes', head: '', cue: '', unilateral: false });
const before = JSON.stringify(store);
X = api();
X.importPack('bro', ['Pull', 'Legs']);
const kept = (id) => store.exercises.filter((x) => x.id === id)[0];
t.is('a name written in other case and spaces is the same exercise, and it is not touched',
  [store.exercises.filter((x) => nameKey(x.name) === 'lat pulldown (cable)').length, JSON.stringify(kept('x1')), kept('x2').muscle],
  [1, JSON.stringify({ id: 'x1', name: '  LAT PULLDOWN (cable)  ', muscle: 'Back', head: '', cue: 'keep', unilateral: true, resetAt: '2026-01-01', step: 9 }), 'Glutes']);
t.is('a routine item on it follows its own unilateral flag: a side, even though Bro says standard', store.routines[0].items[0].side, 'R');
t.is('exercises already there are the very objects they were (nothing rewritten)',
  JSON.stringify(store.exercises.slice(0, 2)), JSON.stringify(JSON.parse(before).exercises));

/* routine names: which count as the same, and what the next free one is */
const withRoutines = (list) => {
  fresh();
  const A = api();
  A.importPack('bro', []);                        // the exercises only, so the routines below can point at them
  const id = (nm) => store.exercises.filter((x) => x.name === nm)[0].id;
  store.routines = list.map((r, i) => ({ id: 'r' + i, name: r[0], items: r[1].map((nm) => ({ exId: id(nm), sets: 3, reps: '8', side: null })) }));
  return A;
};
const PUSH = ['Bench Press (Barbell)', 'Incline Chest Press (Dumbbell)', 'Shoulder Press (Dumbbell)', 'Lateral Raise (Dumbbell)', 'Triceps Pushdown (Cable)'];
const OTHER = ['Squat (Barbell)'];
const names = () => store.routines.map((r) => r.name);
let A = withRoutines([['Pushups', PUSH], ['Push 2b', PUSH], ['Push 20x', PUSH]]);
out = A.importPack('bro', ['Push']);
t.is('"Pushups", "Push 2b" and "Push 20x" are not Push: it comes in plainly', [out.rt, names()], [1, ['Pushups', 'Push 2b', 'Push 20x', 'Push']]);
A = withRoutines([['push', OTHER]]);
out = A.importPack('bro', ['Push']);
t.is('a lower-case "push" with other exercises makes "Push 2"', [out.rt, out.renamed, names()], [1, 1, ['push', 'Push 2']]);
A = withRoutines([['Push 2', PUSH]]);
out = A.importPack('bro', ['Push']);
t.is('only a "Push 2" with the same exercises: it is the pack\'s routine under another number, so skipped', [out.rt, out.skipped, names()], [0, 1, ['Push 2']]);
A = withRoutines([['Push', OTHER], ['Push 3', PUSH]]);
out = A.importPack('bro', ['Push']);
t.is('"Push" different but "Push 3" the same: skipped', [out.rt, out.skipped], [0, 1]);
A = withRoutines([['Push', OTHER], ['Push 2', OTHER]]);
out = A.importPack('bro', ['Push']);
t.is('"Push" and "Push 2" both different: the next free is "Push 3"', [out.rt, names()], [1, ['Push', 'Push 2', 'Push 3']]);
A = withRoutines([['Push', PUSH.concat(['Squat (Barbell)'])]]);
out = A.importPack('bro', ['Push']);
t.is('the same routine plus one more exercise is another routine', [out.rt, names()], [1, ['Push', 'Push 2']]);
A = withRoutines([['Push', PUSH.slice().reverse()]]);
out = A.importPack('bro', ['Push']);
t.is('the same exercises in the other order are the same routine', [out.rt, out.skipped], [0, 1]);

/* a followed routine is somebody else\'s: it is never touched, and a same-named pack routine comes in beside it */
A = withRoutines([['Push', OTHER]]);
store.routines[0].follow = { by: 'u', rid: 'z', user: 'friend', map: {}, side: {}, born: 1, at: 1 };
const f0 = JSON.stringify(store.routines[0]);
out = A.importPack('bro', ['Push']);
t.is('a followed routine stays exactly as it was', [JSON.stringify(store.routines[0]), names()], [f0, ['Push', 'Push 2']]);

/* what is asked for */
A = withRoutines([]);
out = A.importPack('bro', ['Push', 'Push', 'Nonsense', '']);
t.is('a routine asked for twice is brought once, an unknown name is ignored', [out.rt, names()], [1, ['Push']]);
fresh(); X = api();
out = X.importPack('bro', ['Legs', 'Push']);
t.is('routines come in the pack\'s order, whatever the order asked for', names(), ['Push', 'Legs']);
out = X.importPack('nope', ['Push']);
t.is('an unknown pack changes nothing', [out.ex, out.rt, store.routines.length, store.exercises.length], [0, 0, 2, 17]);
fresh(); X = api();
X.importPack('sbl', []);
const ex18 = store.exercises.length;
out = X.importPack('sbl', ['Anterior', 'Posterior', 'Full Body']);
t.is('the exercises first and the routines after is the same as both at once: routines point at the existing ones',
  [out.ex, out.rt, store.exercises.length === ex18, store.routines.every((r) => r.items.every((i) => store.exercises.some((x) => x.id === i.exId)))], [0, 3, true, true]);
fresh(); X = api();
X.importPack('sbl', ['Anterior']);
store.routines[0].items.forEach((i) => { i.sets = 5; i.reps = '1'; });
out = X.importPack('sbl', ['Anterior']);
t.is('a routine you changed in sets and reps is still the same routine', [out.rt, out.skipped, store.routines.length], [0, 1, 1]);
store.routines[0].items.pop();
out = X.importPack('sbl', ['Anterior']);
t.is('and one you cut an exercise from comes back as "Anterior 2"', [out.rt, names()], [1, ['Anterior', 'Anterior 2']]);
t.done();
