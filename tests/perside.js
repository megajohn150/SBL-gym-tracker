/* Per side: one weight entered, the volume counts two. The flag lives on the exercise and is copied onto every
   workout exercise and set (fixPerSide), so history follows a change. node tests/perside.js */
const { slice, suite, bwCode } = require('./lib');
const fs = require('fs');
const t = suite('perside');

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const epley = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
const effReps = (st) => num(st.reps) + num(st.rir);
const pad2 = (n) => (n < 10 ? '0' + n : String(n));
const make = (store, session) => new Function('store', 'session', 'num', 'epley', 'effReps', 'pad2', 'MONTHS',
  slice('  var WT_MIN', '  function wtParse') + bwCode() + slice('  function stepRecords(', '  // Walks the whole history') +
  slice('  function fixPerSide()', '  function saveStore()') +
  '; return { setVol: setVol, recVol: recVol, recOrm: recOrm, stampBw: stampBw, stepRecords: stepRecords, fixPerSide: fixPerSide };')(
  store, session, num, epley, effReps, pad2, []);

// the volume and the best set double, the weight and the 1RM stay as entered
const h0 = make({ weights: {} }, null);
const plain = { weight: '50', reps: '10', rir: '' }, side = { weight: '50', reps: '10', rir: '', ps: '1' };
t.is('volume doubles per side', [h0.setVol(plain), h0.setVol(side)], [500, 1000]);
t.is('best set (volume) doubles', [h0.recVol(plain), h0.recVol(side)], [500, 1000]);
t.is('1RM is the number entered', h0.recOrm(side), h0.recOrm(plain));
const b = { weight: 0, orm: 0, vol: 0 };
h0.stepRecords(b, plain, true);
t.is('a per side set beats the same total set on Volume only', h0.stepRecords(b, side, false).prs, ['Volume']);
t.is('a friend’s ps can only double, never more', h0.setVol({ weight: '10', reps: '1', ps: 'abc' }), 20);

// the migration
const ex = (id, extra) => Object.assign({ id: id, name: id }, extra || {});
const wk = (exId, extra) => ({ id: 'w' + exId, exercises: [Object.assign({ exId: exId, sets: [{ weight: '20', reps: '8' }, { weight: '20', reps: '8' }] }, extra || {})] });
const store = { weights: {}, exercises: [ex('db', { perSide: true }), ex('bb'), ex('oneArm', { perSide: true, unilateral: true }), ex('pull', { perSide: true, bodyweight: true })],
  workouts: [wk('db'), wk('bb', { perSide: true, sets: [{ weight: '1', reps: '1', ps: '1' }] }), wk('gone', { perSide: true, sets: [{ weight: '1', reps: '1', ps: '1' }] }), wk('oneArm')] };
const h = make(store, null);
t.is('the first run changes things', h.fixPerSide() > 0, true);
t.is('history of a per side exercise is stamped', [store.workouts[0].exercises[0].perSide, store.workouts[0].exercises[0].sets.map((s) => s.ps)], [true, ['1', '1']]);
t.is('turning it off clears the history', [store.workouts[1].exercises[0].perSide, store.workouts[1].exercises[0].sets[0].ps], [undefined, undefined]);
t.is('an exercise that is gone keeps its history', [store.workouts[2].exercises[0].perSide, store.workouts[2].exercises[0].sets[0].ps], [true, '1']);
t.is('one-sided and bodyweight cannot be per side', [store.exercises[2].perSide, store.exercises[3].perSide, store.workouts[3].exercises[0].perSide], [undefined, undefined, undefined]);
t.is('a second run changes nothing', h.fixPerSide(), 0);
store.exercises[0].perSide = false;
h.fixPerSide();
t.is('flipping the exercise back rewrites the past', store.workouts[0].exercises[0].sets.map((s) => s.ps), [undefined, undefined]);

// the session: sets are stamped from the exercise, and unstamped when it goes
const sess = { exercises: [{ perSide: true, sets: [{ weight: '', reps: '' }] }, { sets: [{ ps: '1' }] }] };
make({ weights: {} }, sess).stampBw();
t.is('session sets follow their exercise', [sess.exercises[0].sets[0].ps, sess.exercises[1].sets[0].ps], ['1', undefined]);

// it travels: the live payload, a finished workout, the lent exercise and the editing form
const src = fs.readFileSync(require('./lib').FILE, 'utf8');
const has = (from, to, what) => { const a = src.indexOf(from), z = src.indexOf(to, a); return a > 0 && z > a && src.slice(a, z).indexOf(what) > 0; };
t.is('live payload carries it', has('  function livePayload()', '  function sessStats', 'perSide: !!e.perSide') && has('  function livePayload()', '  function sessStats', "ps: st.ps || ''"), true);
t.is('a finished workout carries it', has('  function finishSession(', '    store.workouts.unshift(w)', 'perSide: e.perSide ? true : undefined') && has('  function finishSession(', '    store.workouts.unshift(w)', "out.ps = '1'"), true);
t.is('the form saves it', has('  function saveExercise()', '    var editing', "ex.perSide = true"), true);
t.done();
