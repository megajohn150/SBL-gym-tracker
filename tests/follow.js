/* Silnik followowanych rutyn: mapowanie ćwiczeń, nazwy, zamrażanie,
   strona startowa i to, co się dzieje, gdy zapytanie nie dojdzie.
   node tests/follow.js */
const { slice, suite } = require('./lib');
const block = slice('  function isFollowed(r)', '  /* --- the sign-in gate --- */');
const { cleanSets, cleanStep } = new Function(slice('  function cleanSets(v)', '  function fixCues()') +
  '; return { cleanSets: cleanSets, cleanStep: cleanStep };')();
const t = suite('follow');

let store, toasts, saves, libRows;
let libMode = 'ok';
let n = 0;
const uid = () => 'n' + (++n);
const deriveCode = (s) => s.slice(0, 5).toUpperCase();
const byId = (id) => store.exercises.filter((e) => e.id === id)[0] || null;
const sigOf = (v) => JSON.stringify(v);
const saveStore = () => { saves++; };
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
const social = { fol: true, following: {}, followers: {}, people: {} };
let userView = null;
const sb = {
  from(table) {
    if (table !== 'library') throw new Error('nieoczekiwana tabela ' + table);
    return {
      select() { return this; },
      in(col, ids) {
        if (libMode === 'error') return Promise.resolve({ error: { message: 'boom' } });
        if (libMode === 'throw') return Promise.reject(new Error('offline'));
        return Promise.resolve({ data: libRows.filter((r) => ids.indexOf(r.user_id) >= 0) });
      }
    };
  }
};

const api = {};
eval(block + '\nObject.assign(api, { followRoutine, syncFollowed, followedRt, applyFollow });');

/* --- biblioteka kolegi --- */
const theirEx = [
  { id: 't1', name: 'Bench Press', code: 'BENCH', muscle: 'Chest', cue: 'Elbows tucked', unilateral: false },
  { id: 't2', name: 'Cable Fly', code: 'FLY', muscle: 'Chest', cue: '', unilateral: false },
  { id: 't3', name: 'Single-arm Row', code: 'ROW', muscle: 'Back', cue: '', unilateral: true }
];
const theirRt = {
  id: 'tr1', name: 'Push A', shared: true,
  items: [
    { exId: 't1', sets: 4, reps: '6-8', side: null },
    { exId: 't2', sets: 3, reps: '12-15', side: null }
  ]
};

store = {
  exercises: [{ id: 'm1', name: 'bench press', code: 'BP', muscle: 'Chest', cue: 'mine', unilateral: false }],
  routines: [{ id: 'r0', name: 'Push A', items: [] }]        // kolizja nazw, celowo
};
toasts = []; saves = 0;
social.following.friend = 1;
social.followers.friend = 1;
social.people.friend = { username: 'kolega' };
userView = { id: 'friend', p: { username: 'kolega' }, lib: { routines: [theirRt], exercises: theirEx } };

/* 1. zafollowowanie */
api.followRoutine(theirRt);
const mine = store.routines[1];
t.is('nazwa omija kolizję', mine.name, 'Push A 2');
t.is('moje Bench Press zostaje użyte', mine.items[0].exId, 'm1');
t.is('brakujące dochodzi do biblioteki', store.exercises.length, 2);
t.is('pozycje w ich kolejności', mine.items.map((i) => i.sets), [4, 3]);
t.is('moje cue nietknięte', byId('m1').cue, 'mine');

libRows = [{ user_id: 'friend', data: { routines: [theirRt], exercises: theirEx } }];

let step = Promise.resolve();
const run = (f) => { step = step.then(f); };

/* 2. nic się nie zmieniło */
run(() => { toasts = []; saves = 0; return api.syncFollowed(false); });
run(() => t.is('cicha synchronizacja milczy', [toasts.length, saves], [0, 0]));

/* 3. przestawiają kolejność, dokładają ćwiczenie, zmieniają zakres */
run(() => {
  theirRt.items = [
    { exId: 't2', sets: 4, reps: '10-12', side: null },
    { exId: 't3', sets: 3, reps: '8', side: 'L' },
    { exId: 't1', sets: 5, reps: '5', side: null }
  ];
  toasts = []; saves = 0;
  return api.syncFollowed(false);
});
run(() => {
  t.is('nowa kolejność wchodzi', mine.items.map((i) => i.exId), ['n2', 'n3', 'm1']);
  t.is('nowe serie wchodzą', mine.items.map((i) => i.sets), [4, 3, 5]);
  t.is('jednostronne trzyma stronę', mine.items[1].side, 'L');
  t.is('jeden toast, jeden zapis', [toasts, saves], [['@kolega changed “Push A 2”'], 1]);
});

/* 4. zmieniają nazwę ruchu — bez rozdwojenia biblioteki */
run(() => {
  theirEx[1].name = 'Cable Flye';
  toasts = []; saves = 0;
  return api.syncFollowed(false);
});
run(() => {
  t.is('biblioteka się nie rozdwaja', store.exercises.length, 3);
  t.is('to wciąż ten sam ruch', mine.items[0].exId, 'n2');
});

/* 5. zmieniają nazwę rutyny */
run(() => { theirRt.name = 'Push Day'; return api.syncFollowed(false); });
run(() => t.is('ich nazwa idzie za nimi', mine.name, 'Push Day'));

/* 6. wyłączają udostępnianie */
run(() => {
  theirRt.shared = false;
  toasts = []; saves = 0;
  return api.syncFollowed(false);
});
run(() => {
  t.is('zamraża się, oznaczona', [mine.follow.dead, mine.items.length], [1, 3]);
  t.is('i mówi o tym', toasts, ['@kolega no longer shares “Push Day”']);
});

/* 7. włączają z powrotem */
run(() => { theirRt.shared = true; toasts = []; return api.syncFollowed(false); });
run(() => t.is('wraca do życia', mine.follow.dead, 0));

/* 8. koniec znajomości */
run(() => {
  delete social.followers.friend;
  toasts = [];
  return api.syncFollowed(false);
});
run(() => {
  t.is('bez znajomego nie ma wglądu', mine.follow.dead, 1);
  t.is('rutyna zostaje', mine.items.length, 3);
});

/* 9. próg przy wejściu w zakładkę */
run(() => {
  social.followers.friend = 1;
  toasts = [];
  return api.syncFollowed(true);
});
run(() => t.is('miękkie spojrzenie w ciągu minuty pomijane', mine.follow.dead, 1));

/* 10. strona startowa jest moja i przeżywa ich zmiany */
run(() => {
  mine.follow.side = mine.follow.side || {};
  mine.follow.side.n3 = 'L';
  theirRt.items = [
    { exId: 't3', sets: 4, reps: '8', side: 'R' },
    { exId: 't1', sets: 5, reps: '5', side: null }
  ];
  return api.syncFollowed(false);
});
run(() => {
  t.is('rutyna znów żywa', mine.follow.dead, 0);
  t.is('ich strona nie wygrywa', mine.items[0].side, 'L');
  t.is('ich serie owszem', mine.items[0].sets, 4);
});

/* 11. ruch robiony obustronnie nie ma strony */
run(() => {
  store.exercises.filter((e) => e.id === 'n3')[0].unilateral = false;
  return api.syncFollowed(false);
});
run(() => t.is('brak strony startowej', mine.items[0].side, null));

/* 12. nieudane zapytanie to nie wiadomość o końcu udostępniania */
run(() => {
  libMode = 'error';
  toasts = []; saves = 0;
  return api.syncFollowed(false);
});
run(() => t.is('nieudane spojrzenie nic nie zmienia',
  [mine.follow.dead, toasts.length, saves], [0, 0, 0]));

/* 13. a takie, które rzuciło, nie blokuje następnego */
run(() => { libMode = 'throw'; return api.syncFollowed(false); });
run(() => {
  libMode = 'ok';
  theirRt.items = [{ exId: 't1', sets: 2, reps: '12', side: null }];
  toasts = [];
  return api.syncFollowed(false);
});
run(() => {
  t.is('następne spojrzenie dochodzi', mine.items.map((i) => i.exId), ['m1']);
  t.is('i nadal się odzywa', toasts.length, 1);
});

step.then(() => t.done());
