/* Co się dzieje ze zmianą zapisaną tutaj, kiedy odpowiedź na pobranie
   danych jest jeszcze w drodze. node tests/pull.js */
const { slice, suite } = require('./lib');
const block = slice('  function mergeStores(local, remote)',
                    '  // The log and the running session move');
const t = suite('pull');

let store;
let session = null;
const me = { id: 'me' };
let cloud = { rev: 0, timer: null, dirty: false, pulled: false, dataSig: '', sessSig: '' };
let answer = null;

const sigOf = (v) => JSON.stringify(v);
const save = () => {};
const syncState = () => {};
const saveLocalSession = () => {};
const queuePush = () => { cloud.dirty = true; };
const cloudPush = () => Promise.resolve();
const saveStore = () => { queuePush(); };
const fixHeads = () => 0;
const fixCues = () => 0;
const recomputeRecords = () => {};
const drawExercises = () => {};
const drawRoutines = () => {};
const drawHome = () => {};
const drawProfile = () => {};
const drawDock = () => {};
const drawSession = () => {};
const current = () => 's-home';
const sb = { from: () => ({ select() { return this; }, eq() { return this; },
  maybeSingle: () => answer() }) };

eval(block);

const R = (name, items) => ({
  id: 'r' + name, name, follow: { by: 'f', rid: 't' + name },
  items: items.map((x) => ({ exId: 'e' + x, sets: x, reps: '', side: null }))
});
const shape = () => ({
  exercises: [{ id: 'e1', name: 'A' }], routines: [R('one', [1]), R('two', [2])],
  workouts: [], gone: [], targets: {}, profile: {}
});

function reset() {
  store = shape();
  cloud = { rev: 4, timer: null, dirty: false, pulled: true, dataSig: '', sessSig: '' };
}
// kopia w chmurze: bez zmiany zrobionej tutaj
const remote = () => ({ data: { data: shape(), session: null, rev: 4 } });

/* 1. followowana rutyna doprowadzona do porządku w trakcie lotu odpowiedzi */
reset();
answer = () => new Promise((res) => {
  setTimeout(() => {
    store.routines[0].items.reverse();
    store.routines[0].items[0].sets = 99;
    saveStore();
    res(remote());
  }, 0);
});

cloudPull().then(() => {
  t.is('zmiana przeżywa pobranie', store.routines[0].items[0].sets, 99);
  t.is('i czeka na wysyłkę', cloud.dirty, true);

  /* 2. spokojne pobranie nadal bierze to, co w chmurze */
  reset();
  store.routines = [];
  answer = () => Promise.resolve(remote());
  return cloudPull();
}).then(() => {
  t.is('spokojne pobranie scala', store.routines.length, 2);

  /* 3. pierwszego pobrania w sesji nigdy nie pomijamy */
  reset();
  cloud.pulled = false;
  cloud.rev = 0;
  store.routines = [];
  answer = () => new Promise((res) => {
    setTimeout(() => { store.workouts.push({ id: 'w', date: '2026-01-01' }); res(remote()); }, 0);
  });
  return cloudPull();
}).then(() => {
  t.is('pierwsze pobranie dochodzi', store.routines.length, 2);
  t.done();
});
