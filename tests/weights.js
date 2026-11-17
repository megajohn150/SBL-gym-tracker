/* Weight: one number a day. What is believed, how two devices join their days, and the change
   against the weigh-in before. node tests/weights.js */
const { slice, suite, planClean } = require('./lib');
const t = suite('weights');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => (n < 10 ? '0' + n : String(n));
const merge = new Function(planClean() + slice('  function mergeStores(local, remote)', '  function redrawAll()') +
  '; return { mergeStores: mergeStores, unionStores: unionStores, cleanWeights: cleanWeights };')();
const line = (store) => new Function('store', 'MONTHS', 'pad2',
  slice('  var WT_MIN', '  function wtSet(') + '; return { wtLine: wtLine, wtParse: wtParse };')(store, MONTHS, pad2);

t.is('only real days with a believable weight survive', merge.cleanWeights({
  '2026-11-01': 82.46, '2026-11-02': '81', '2026-11-03': 5, '2026-11-04': 900, '11-05': 80, '2026-11-06': null, '2026-11-07': 'x' }),
{ '2026-11-01': 82.5, '2026-11-02': 81 });
t.is('garbage is no weights', [null, [], 'a', 3].map((x) => merge.cleanWeights(x)), [{}, {}, {}, {}]);

const a = { weights: { '2026-11-01': 82, '2026-11-02': 81.5 }, workouts: [] };
const b = { weights: { '2026-11-02': 80, '2026-11-03': 81 }, workouts: [] };
t.is('a pull takes the cloud copy whole, so a deleted day stays deleted', merge.mergeStores(a, b).weights, { '2026-11-02': 80, '2026-11-03': 81 });
t.is('a cloud row without weights leaves ours alone', merge.mergeStores(a, { workouts: [] }).weights, a.weights);
t.is('a lock clash keeps every day, this device winning', merge.unionStores(a, b).weights,
  { '2026-11-02': 81.5, '2026-11-03': 81, '2026-11-01': 82 });

const w = line({ weights: { '2026-11-01': 82, '2026-11-05': 81.5 } });
t.is('the change is against the weigh-in before, not the one after', [w.wtLine('2026-11-05', 81.5), w.wtLine('2026-11-03', 83)],
  ['−0.5 kg vs 82 kg on 1 Nov', '+1.0 kg vs 82 kg on 1 Nov']);
t.is('no weigh-in before is a first entry; nothing typed names the one before', [w.wtLine('2026-11-01', 82), w.wtLine('2026-11-03', 0)],
  ['First entry', 'Before: 82 kg on 1 Nov']);
t.is('a comma works, a number outside the range does not', [w.wtParse('82,45'), w.wtParse('8'), w.wtParse('abc')], [82.5, 0, 0]);

t.done();
