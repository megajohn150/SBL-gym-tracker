/* An exercise that turns unilateral (or standard) must change every routine item that uses it, and
   a routine left stale by an older version heals on the next fixCues. node tests/sides.js */
const { slice, suite } = require('./lib');
const t = suite('sides');

const run = (store) => new Function('store', 'byId',
  slice('  function cleanSets(v)', '  function cleanStep') + slice('  function fixCues()', '  function saveStore()') + '; return fixCues;')(
  store, (id) => store.exercises.filter((x) => x.id === id)[0])();

const mk = () => ({
  exercises: [{ id: 'a', cue: '', name: 'A', unilateral: true }, { id: 'b', cue: '', name: 'B' }],
  routines: [
    { items: [{ exId: 'a', sets: 3, side: null }, { exId: 'b', sets: 3, side: 'L' }, { exId: 'gone', sets: 3, side: 'L' }] },
    { items: [{ exId: 'a', sets: 3, side: null }], follow: { side: { a: 'L' } } },
    { items: [{ exId: 'a', sets: 3, side: 'L' }] }
  ]
});

let s = mk();
const n = run(s);
t.is('a stale routine heals: unilateral gets a side, standard loses it, an unknown exercise is left', [
  s.routines[0].items.map((i) => i.side), s.routines[1].items[0].side, s.routines[2].items[0].side, n > 0],
  [['R', null, 'L'], 'L', 'L', true]);

t.is('a second pass changes nothing', run(s), 0);

s.exercises[0].unilateral = false;
run(s);
t.is('turning standard: the side goes everywhere', [
  s.routines[0].items[0].side, s.routines[1].items[0].side, s.routines[2].items[0].side], [null, null, null]);

t.done();
