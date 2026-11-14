/* Trzy rutyny followowane od jednej osoby: co się dzieje, gdy zmieni się
   jedna, gdy ktoś przemianuje ruch, gdy pola obiektu są w innej kolejności
   i gdy magazyn zostanie podmieniony w trakcie synchronizacji.
   node tests/routines.js */
const { slice, suite } = require('./lib');
const block = slice('  function isFollowed(r)', '  /* --- the sign-in gate --- */');
const { cleanSets, cleanStep } = new Function(slice('  function cleanSets(v)', '  function fixCues()') +
  '; return { cleanSets: cleanSets, cleanStep: cleanStep };')();
const t = suite('routines');

let store, toasts, libRows;
let swap = false;                    // pobranie z innego urządzenia ląduje w locie
let n = 0;
const uid = () => 'n' + (++n);
const deriveCode = (s) => s.slice(0, 5).toUpperCase();
const byId = (id) => store.exercises.filter((e) => e.id === id)[0] || null;
const sigOf = (v) => JSON.stringify(v);
const saveStore = () => {};
const drawRoutines = () => {};
const drawExercises = () => {};
const drawRtView = () => {};
const current = () => 's-workout';
const toast = (m) => { toasts.push(m); };
const routineName = (base) => {
  let name = base || 'Routine';
  let i = 2;
  const taken = (v) => store.routines.some((r) => String(r.name).toLowerCase() === v.toLowerCase());
  while (taken(name)) { name = base + ' ' + i; i++; }
  return name;
};
const me = { id: 'me' };
const social = { fol: true, following: { friend: 1 }, followers: { friend: 1 },
                 people: { friend: { username: 'adam' } } };
let userView = null;
const sb = { from: () => ({
  select() { return this; },
  in: (c, ids) => Promise.resolve().then(() => {
    if (swap) { store = JSON.parse(JSON.stringify(store)); swap = false; }
    return { data: libRows.filter((r) => ids.indexOf(r.user_id) >= 0) };
  })
}) };

const api = {};
eval(block + '\nObject.assign(api, { followRoutine, syncFollowed });');

/* --- cztery ruchy, trzy rutyny, wszystkie udostępnione --- */
const theirEx = [
  { id: 't1', name: 'Bench Press', code: 'BENCH', muscle: 'Chest', cue: '', unilateral: false },
  { id: 't2', name: 'Incline DB Press', code: 'INCDB', muscle: 'Chest', cue: '', unilateral: false },
  { id: 't3', name: 'Lat Pulldown', code: 'PULL', muscle: 'Back', cue: '', unilateral: false },
  { id: 't4', name: 'Barbell Row', code: 'ROW', muscle: 'Back', cue: '', unilateral: false }
];
const R = (id, name, ex) => ({
  id, name, shared: true,
  items: ex.map((e) => ({ exId: e, sets: 3, reps: '8-10', side: null }))
});
const theirRts = [
  R('tr1', 'Push A', ['t1', 't2']),
  R('tr2', 'Pull A', ['t3', 't4']),
  R('tr3', 'Full body', ['t1', 't3', 't2'])
];

store = { exercises: [], routines: [] };
toasts = [];
userView = { id: 'friend', p: { username: 'adam' }, lib: { routines: theirRts, exercises: theirEx } };
theirRts.forEach((rt) => api.followRoutine(rt));
libRows = [{ user_id: 'friend', data: { routines: theirRts, exercises: theirEx } }];

t.is('trzy rutyny weszły', store.routines.map((r) => r.name), ['Push A', 'Pull A', 'Full body']);
t.is('cztery ruchy doszły do biblioteki', store.exercises.length, 4);

let step = Promise.resolve();
const run = (f) => { step = step.then(f); };

/* 1. nic nie ruszone */
run(() => { toasts = []; return api.syncFollowed(false); });
run(() => t.is('cicha synchronizacja', toasts, []));

/* 2. kolejność w JEDNEJ rutynie */
run(() => {
  theirRts[0].items.reverse();
  toasts = [];
  return api.syncFollowed(false);
});
run(() => t.is('jedna zmiana, nie trzy', toasts, ['@adam changed “Push A”']));

/* 3. i znowu cisza */
run(() => { toasts = []; return api.syncFollowed(false); });
run(() => t.is('po zmianie znowu cicho', toasts, []));

/* 4. przemianowanie ruchu, który przyszedł razem z rutyną */
run(() => {
  theirEx[0].name = 'Flat Barbell Bench';
  toasts = [];
  return api.syncFollowed(false);
});
run(() => {
  t.is('nazwa ruchu idzie za autorem', byId(store.routines[0].items[1].exId).name, 'Flat Barbell Bench');
  t.is('ale rutyna się nie zmieniła', toasts, []);
});

/* 5. ruch, którego używam we własnej rutynie, zostaje mój */
run(() => {
  store.routines.push({ id: 'own', name: 'My own day',
    items: [{ exId: store.routines[1].items[0].exId, sets: 3, reps: '', side: null }] });
  theirEx[2].name = 'Wide Lat Pulldown';
  toasts = [];
  return api.syncFollowed(false);
});
run(() => t.is('mojego ruchu nie przemianują',
  byId(store.routines[1].items[0].exId).name, 'Lat Pulldown'));

/* 6. magazyn podmieniony pod trwającą synchronizacją */
run(() => {
  theirRts[1].items.reverse();
  swap = true;
  toasts = [];
  return api.syncFollowed(false);
});
run(() => {
  const live = store.routines.filter((r) => r.follow && r.follow.rid === 'tr2')[0];
  t.is('zmiana ląduje w żywym magazynie',
    live.items.map((i) => byId(i.exId).name), ['Barbell Row', 'Lat Pulldown']);
  t.is('i mówi o tym raz', toasts, ['@adam changed “Pull A”']);
  toasts = [];
  return api.syncFollowed(false);
});
run(() => t.is('a potem milczy', toasts, []));

/* 7. ta sama rutyna zapisana z polami w innej kolejności */
run(() => {
  store.routines.filter((r) => r.follow).forEach((r) => {
    r.items = r.items.map((it) => ({ exId: it.exId, reps: it.reps, sets: it.sets, side: it.side }));
  });
  toasts = [];
  return api.syncFollowed(false);
});
run(() => t.is('kolejność pól to nie zmiana', toasts, []));

/* 8. prawdziwa zmiana nadal przechodzi */
run(() => {
  theirRts[2].items.push({ exId: 't4', sets: 4, reps: '6', side: null });
  toasts = [];
  return api.syncFollowed(false);
});
run(() => t.is('dołożone ćwiczenie widać', toasts, ['@adam changed “Full body”']));

step.then(() => t.done());
