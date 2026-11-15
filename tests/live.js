/* Trening na żywo: to, co leci do znajomych, to tylko to, co rysuje ekran
   sesji. Notatki zostają w domu. */
const { slice, suite } = require('./lib');

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const code = slice('  function sessStats()', '  function drawSessTotals()') + slice('  function livePayload() {', '  // not pushLive');
const logged = (st) => num(st.reps) > 0;
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
const payload = new Function('session', 'store', 'num', 'logged', code + '; return livePayload();')(session, { profile: {} }, num, logged);
const off = new Function('session', 'store', 'num', 'logged', code + '; return livePayload();')(session, { profile: { noReact: true } }, num, logged);
const text = JSON.stringify(payload);

t.is('the session note does not leave', text.includes('tajna'), false);
t.is('neither does a note on an exercise', text.includes('bolało') || text.includes('zeszły'), false);
t.is('the exercise id stays home too', text.includes('"exId"'), false);
t.is('what the screen draws goes', [payload.name, payload.idx, 'pausedAt' in payload, payload.exercises[0].cue],
  ['Anterior', 1, false, '2 | Lowest']);
t.is('a set keeps its weight, its tick and its plates',
  payload.exercises[0].sets.map((s) => [s.weight, s.done, s.plate]), [['115.3', true, 2], ['', false, 0]]);
t.is('a hole in last time stays a hole', payload.exercises[0].prev.length, 2);
t.is('reactions are on by default, and the flag says when they are off', [payload.react, off.react], [true, false]);
t.is('the header row goes along, as numbers the viewer cannot work out himself', payload.stats, { cnt: 1, all: 2, vol: 691.8, prs: 0 });
t.done();
