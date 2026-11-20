/* Co się dzieje ze zmianą zapisaną tutaj, kiedy odpowiedź na pobranie
   danych jest jeszcze w drodze. node tests/pull.js */
const { slice, suite, planClean } = require('./lib');
const block = planClean() + slice('  function mergeStores(local, remote)',
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
let pushes = 0;
const cloudPush = () => { pushes++; return Promise.resolve(); };
const saveStore = () => { queuePush(); };
const fixHeads = () => 0;
const fixCues = () => 0, fixPerSide = () => 0;
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

/* 0. dwa urządzenia spotkały się na blokadzie: nic z żadnej strony nie ginie */
const mine = { exercises: [{ id: 'a', name: 'mine' }], routines: [{ id: 'r', name: 'local edit' }],
  workouts: [{ id: 'w1', date: '2026-01-02' }], gone: [], targets: { Chest: { sets: 5 } }, injuries: [], profile: { n: 1 } };
const theirs = { exercises: [{ id: 'a', name: 'old' }, { id: 'b', name: 'only there' }],
  routines: [{ id: 'r', name: 'remote' }, { id: 's', name: 'only there' }],
  workouts: [{ id: 'w2', date: '2026-01-03' }], gone: [], targets: { Legs: { sets: 9 } }, injuries: [] };
const u = unionStores(mine, theirs);
t.is('treningi z obu stron zostają', u.workouts.map((w) => w.id), ['w2', 'w1']);
t.is('przy zderzeniu wygrywa ta kopia', u.routines.map((r) => r.name), ['local edit', 'only there']);
t.is('ćwiczenia z obu stron zostają', u.exercises.map((e) => e.name), ['mine', 'only there']);
t.is('cele z obu stron zostają', Object.keys(u.targets).sort(), ['Chest', 'Legs']);
/* pusta lista w chmurze: świeży wiersz nie kasuje, jawne wyczyszczenie tak */
const keep = mergeStores({ exercises: [{ id: 'a' }], routines: [{ id: 'r' }], workouts: [] }, { exercises: [], routines: [], workouts: [] });
t.is('pusty wiersz w chmurze nie kasuje', keep.routines.length, 1);
const wipe = mergeStores({ exercises: [{ id: 'a' }], routines: [{ id: 'r' }], workouts: [] }, { exercises: [], routines: [], workouts: [], wiped: 5 });
t.is('wyczyszczone na innym urządzeniu znika i tu', [wipe.routines.length, wipe.exercises.length], [0, 0]);

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

  /* 4. coś zapisane bez sieci, aplikacja zamknięta, otwarta znowu: pierwsze pobranie
        nie może położyć chmury na niewysłanym, a skończony trening nie wraca jako sesja */
  reset();
  cloud.pulled = false;
  cloud.rev = 0;
  cloud.dirty = true;
  pushes = 0;
  store.routines = [{ id: 'mine', name: 'offline edit', items: [] }];
  answer = () => Promise.resolve({ data: { data: shape(), session: { exercises: [] }, rev: 4 } });
  return cloudPull();
}).then(() => {
  t.is('niewysłane zmiany przeżywają restart', store.routines.map((r) => r.name), ['offline edit']);
  t.is('i idą w górę od razu, żeby spotkać się z chmurą na blokadzie', pushes, 1);
  t.is('sesja z chmury nie wraca', session, null);
  t.done();
});
