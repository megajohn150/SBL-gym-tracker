/* Deleted ids are remembered by every device and the list only grows. Whatever brings a
   workout back (a backup file, a previous version) has to survive the next device that
   still remembers it as deleted. node tests/gone.js */
const { slice, suite } = require('./lib');
const t = suite('gone');
const swap = slice('  function swapWorkouts(list)', '  function importData(text)');
const merge = new Function(slice('  function mergeStores(local, remote)', '  function redrawAll()') +
  '; return { mergeStores: mergeStores, unionStores: unionStores };')();

let n = 0;
const store = { workouts: [{ id: 'keep', date: '2026-01-03' }, { id: 'only-here', date: '2026-01-02' }], gone: ['was-deleted'] };
const file = [{ id: 'keep', date: '2026-01-03' }, { id: 'was-deleted', date: '2026-01-01', name: 'back' }];
new Function('store', 'uid', 'list', swap + '; swapWorkouts(list);')(store, () => 'new' + (++n), file);

t.is('what the file has is what the log has', store.workouts.map((w) => w.name || w.id), ['keep', 'back']);
t.is('a workout back from the dead has a new id', store.workouts[1].id, 'new1');
t.is('what the file lacks is marked deleted, the old tombstone stays', store.gone, ['was-deleted', 'only-here']);

// the other device still has the old state and syncs
const other = { workouts: [{ id: 'keep', date: '2026-01-03' }, { id: 'only-here', date: '2026-01-02' }], gone: ['was-deleted'] };
const after = merge.mergeStores(other, store);
t.is('another device ends up with the same log, not the old one', after.workouts.map((w) => w.id), ['keep', 'new1']);

const a = { workouts: [{ id: 'x', date: '2026-01-01', name: 'local edit' }, { id: 'd', date: '2026-01-05' }], gone: [] };
const b = { workouts: [{ id: 'x', date: '2026-01-01', name: 'remote' }, { id: 'y', date: '2026-01-09' }], gone: ['d'] };
const m = merge.mergeStores(a, b);
t.is('a merge: newest first, this device wins a clash, a tombstone from either side removes', m.workouts.map((w) => w.name || w.id), ['y', 'local edit']);
t.is('tombstones are joined', m.gone, ['d']);
t.is('with no lists at all nothing throws', merge.mergeStores({}, {}).workouts, []);
t.done();
