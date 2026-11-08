/* Trening na żywo: to, co leci do znajomych, to tylko to, co rysuje ekran
   sesji. Notatki zostają w domu. */
const { slice, suite } = require('./lib');

const code = slice('  function livePayload() {', '  // not pushLive');
const t = suite('live');

const session = {
  name: 'Anterior', startedAt: 1000, pausedAt: null, idx: 1, note: 'tajna notatka',
  exercises: [{
    exId: 'a', name: 'Chest Fly', code: 'CF', muscle: 'Chest', unilateral: false, cue: '2 | Lowest',
    reps: '5-9', snote: 'bolało', prevNote: 'zeszły tydzień', side: null,
    prev: [{ weight: '100', reps: '8', rir: '1', plate: 2 }, undefined],
    sets: [{ label: '01', weight: '115.3', reps: '6', rir: '1', done: true, plate: 2 },
           { label: '02', weight: '', reps: '', rir: '' }]
  }]
};
const payload = new Function('session', code + '; return livePayload();')(session);
const text = JSON.stringify(payload);

t.is('the session note does not leave', text.includes('tajna'), false);
t.is('neither does a note on an exercise', text.includes('bolało') || text.includes('zeszły'), false);
t.is('the exercise id stays home too', text.includes('"exId"'), false);
t.is('what the screen draws goes', [payload.name, payload.idx, payload.pausedAt, payload.exercises[0].cue],
  ['Anterior', 1, 0, '2 | Lowest']);
t.is('a set keeps its weight, its tick and its plates',
  payload.exercises[0].sets.map((s) => [s.weight, s.done, s.plate]), [['115.3', true, 2], ['', false, 0]]);
t.is('a hole in last time stays a hole', payload.exercises[0].prev.length, 2);
t.done();
