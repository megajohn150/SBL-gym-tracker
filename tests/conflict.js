/* Two devices write at once: the lock refuses the second one. Its copy and the
   other's must be joined before it goes up, not laid over it. node tests/conflict.js */
const { slice, suite } = require('./lib');
const t = suite('conflict');

const unionCode = slice('  function mergeStores(local, remote)', '  function redrawAll()');
const pushCode = slice('  function cloudPush(force)', '  // one write per burst');

const me = { id: 'me' };
let session = null;
let store = {
  exercises: [{ id: 'a' }], routines: [{ id: 'r', name: 'mine' }],
  workouts: [{ id: 'w1', date: '2026-01-02' }], gone: [], targets: {}, injuries: [], profile: {}
};
const cloud = { rev: 4, timer: null, dirty: true, pulled: true, dataSig: 'old', sessSig: '' };
// what the other device wrote meanwhile
const row = { rev: 5, data: { exercises: [{ id: 'a' }], routines: [], workouts: [{ id: 'w2', date: '2026-01-03' }],
  gone: [], targets: {}, injuries: [] } };
const sent = [];
const sb = {
  from: () => {
    const q = { mode: '' };
    q.update = () => { q.mode = 'update'; return q; };
    q.upsert = (r) => { q.mode = 'upsert'; sent.push(r); return q; };
    q.select = () => q;
    q.eq = () => q;
    q.maybeSingle = () => Promise.resolve(
      q.mode === 'update' ? { data: null } :           // the lock says no
      q.mode === 'upsert' ? { data: { rev: 6 } } : { data: row });
    return q;
  }
};
const sigOf = (v) => JSON.stringify(v);
const noop = () => {};
const save = noop, syncState = noop, redrawAll = noop;

const run = new Function('me', 'sb', 'cloud', 'sigOf', 'save', 'syncState', 'redrawAll', 'session',
  'getStore', 'setStore',
  'var store = getStore();' + unionCode + pushCode +
  '; return { push: cloudPush, store: function () { return store; } };');
const api = run(me, sb, cloud, sigOf, save, syncState, redrawAll, session, () => store, (s) => { store = s; });

api.push().then(() => {
  const up = sent[0];
  t.is('the forced write happened once', sent.length, 1);
  t.is('it carries the log of both devices', up.data.workouts.map((w) => w.id).sort(), ['w1', 'w2']);
  t.is('it keeps what was only here', up.data.routines.map((r) => r.name), ['mine']);
  t.is('and goes up on top of their revision', up.rev, 6);
  t.done();
});
