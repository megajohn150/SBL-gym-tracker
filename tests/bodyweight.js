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
  '; return { setVol: setVol, recVol: recVol, recOrm: recOrm, stampBw: stampBw, stepRecords: stepRecords };')(
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
t.is('at +0 an extra rep is a record (1RM), the added-weight ones are not', [h.stepRecords(b, set(11), false).prs, h.stepRecords(b, set(8), false).prs], [['1RM'], []]);
t.is('added weight breaks all three', h.stepRecords(b, set(5, '20'), false).prs, ['Weight', '1RM', 'Volume']);
t.is('with no body weight and no added weight there is nothing to record', make({ weights: {} }, null).stepRecords({ weight: 0, orm: 0, vol: 0 }, { weight: '', reps: '10', rir: '' }, false).prs, []);

const session = { exercises: [{ bodyweight: true, sets: [{}, {}] }, { sets: [{}] }] };
make({ weights: { '2026-11-03': 75, '2026-11-10': 74.05 } }, session).stampBw();
t.is('the newest weigh-in is stamped on bodyweight sets only', [session.exercises[0].sets.map((s) => s.bw), session.exercises[1].sets[0].bw], [['74.05', '74.05'], undefined]);
const none = { exercises: [{ bodyweight: true, sets: [{}] }] };
make({ weights: {} }, none).stampBw();
t.is('with no weigh-in the stamp is empty', none.exercises[0].sets[0].bw, '');
t.done();
