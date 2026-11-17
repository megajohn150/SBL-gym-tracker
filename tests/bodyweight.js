/* Bodyweight sets: the body counts in the volume only; records, 1RM and best set read the added load.
   node tests/bodyweight.js */
const { slice, suite, bwCode } = require('./lib');
const t = suite('bodyweight');

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const epley = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
const effReps = (st) => num(st.reps) + num(st.rir);
const pad2 = (n) => (n < 10 ? '0' + n : String(n));
const make = (store, session) => new Function('store', 'session', 'num', 'epley', 'effReps', 'pad2', 'MONTHS',
  slice('  var WT_MIN', '  function wtParse') + bwCode() + slice('  function stepRecords(', '  // Walks the whole history') +
  '; return { setVol: setVol, recVol: recVol, recOrm: recOrm, prVol: prVol, stampBw: stampBw, stepRecords: stepRecords };')(
  store, session, num, epley, effReps, pad2, []);

const h = make({ weights: { '2026-11-03': 75, '2026-11-10': 74.05 } }, null);
const bw = { weight: '10', reps: '6', rir: '', bw: '74.05' };
t.is('volume is body plus added, times reps', Math.round(h.setVol(bw) * 100) / 100, 504.3);
t.is('a normal set is untouched', [h.setVol({ weight: '100', reps: '5' }), h.recOrm({ weight: '100', reps: '5', rir: '' })], [500, epley(100, 5)]);
t.is('best set is the added load only', h.recVol(bw), 60);
t.is('1RM counts the body, less the body again', Math.round(h.recOrm({ weight: '0', reps: '10', rir: '', bw: '80' }) * 100) / 100, 26.67);
t.is('so a rep more at +0 is a higher estimate', h.recOrm({ weight: '0', reps: '11', rir: '', bw: '80' }) > h.recOrm({ weight: '0', reps: '10', rir: '', bw: '80' }), true);
t.is('a friend’s body weight is bounded and must be a number', [h.setVol({ weight: '0', reps: '1', bw: '99999' }), h.setVol({ weight: '0', reps: '1', bw: 'abc' }), h.setVol({ weight: '0', reps: '1', bw: '-5' })], [500, 0, 0]);

const b = { weight: 0, orm: 0, vol: 0 };
const set = (reps, extra) => ({ weight: extra || '', reps: String(reps), rir: '', bw: '80' });
h.stepRecords(b, set(10), true);
t.is('at +0 an extra rep is a record, fewer reps are not', [h.stepRecords(b, set(11), false).prs, h.stepRecords(b, set(8), false).prs], [['1RM', 'Volume'], []]);
// the case the 1RM alone misses: a loaded set once set a high estimate, so more reps at +0 must count on their own
const c = { weight: 0, orm: 0, vol: 0, rep0: 0 };
h.stepRecords(c, { weight: '20', reps: '5', rir: '', bw: '80' }, true);
t.is('the first +0 set after loaded ones only sets the bar', h.stepRecords(c, set(12), false).prs, []);
t.is('more reps than ever at +0 is a best-set record even when the estimate is lower', [h.stepRecords(c, set(13), false).prs, h.stepRecords(c, set(13), false).prs], [['Volume'], []]);
t.is('and it remembers what it beat, in kg of the body', (() => { const d = { weight: 0, orm: 999, vol: 0, rep0: 12 }; return h.stepRecords(d, set(14), false).was; })(), { Volume: 960 });
t.is('a medal at +0 shows the body lifted that many times, a loaded one the added load', [h.prVol(set(14)), h.prVol({ weight: '10', reps: '6', rir: '', bw: '80' })], [1120, 60]);
t.is('added weight breaks all three', h.stepRecords(b, set(5, '20'), false).prs, ['Weight', '1RM', 'Volume']);
t.is('with no body weight and no added weight there is nothing to record', make({ weights: {} }, null).stepRecords({ weight: 0, orm: 0, vol: 0 }, { weight: '', reps: '10', rir: '' }, false).prs, []);

const session = { exercises: [{ bodyweight: true, sets: [{}, {}] }, { sets: [{}] }] };
make({ weights: { '2026-11-03': 75, '2026-11-10': 74.05 } }, session).stampBw();
t.is('the newest weigh-in is stamped on bodyweight sets only', [session.exercises[0].sets.map((s) => s.bw), session.exercises[1].sets[0].bw], [['74.05', '74.05'], undefined]);
const none = { exercises: [{ bodyweight: true, sets: [{}] }] };
make({ weights: {} }, none).stampBw();
t.is('with no weigh-in the stamp is empty', none.exercises[0].sets[0].bw, '');
// a +0 set has no weight to fill in: only a normal set needs it before it can be ticked
const full = new Function(slice('  function setFull(st)', '  // the whole exercise is behind you') + '; return setFull;')();
t.is('a bodyweight set is full without an added weight, a normal one is not', [full({ weight: '', reps: '8', rir: '1', bw: '74' }), full({ weight: '', reps: '8', rir: '1' }), full({ weight: '', reps: '8', rir: '', bw: '74' })], [true, false, false]);
t.done();
