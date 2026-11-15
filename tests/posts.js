/* The copy of the log that friends see. An upload that failed must be tried again, and
   nothing may be deleted by a local copy that has not met the cloud yet. node tests/posts.js */
const { slice, suite } = require('./lib');
const code = slice('  function syncPosts() {', '  function queueSocial() {');
const t = suite('posts');

function world(have) {
  const w = { fail: false, ups: [], dels: [], saved: 0 };
  const sb = { from: () => {
    const q = { m: 'sel' };
    q.select = () => q; q.eq = () => q;
    q.in = (c, ids) => { w.dels.push(ids); return q; };
    q.delete = () => { q.m = 'del'; return q; };
    q.upsert = (rows) => { q.m = 'up'; w.ups.push(rows.map((r) => r.id + ':' + r.data.name)); return q; };
    q.then = (ok) => Promise.resolve().then(() => (q.m === 'sel' ? { data: have.map((id) => ({ id })) }
      : w.fail ? { error: { message: 'offline' } } : { data: null })).then(ok);
    return q;
  } };
  w.store = { workouts: [{ id: 'w1', name: 'edited' }] };
  w.sigs = { posts: { w1: 'old' } };
  w.social = { username: 'me', dirty: false };
  w.cloud = { pulled: true };
  w.sync = new Function('sb', 'me', 'social', 'cloud', 'store', 'sigs', 'sigOf', 'sigsSave', 'postRow',
    code + '; return syncPosts;')(sb, { id: 'me' }, w.social, w.cloud, w.store, w.sigs,
    (v) => JSON.stringify(v), () => { w.saved++; }, (x) => ({ id: x.id, data: x }));
  return w;
}

(async () => {
  let w = world(['w1']);
  w.fail = true;
  await w.sync();
  t.is('a failed upload is remembered as unsent', [w.social.dirty, w.sigs.posts.w1, w.saved], [true, 'old', 0]);
  w.fail = false;
  await w.sync();
  t.is('and goes up on the next look', w.ups, [['w1:edited'], ['w1:edited']]);
  await w.sync();
  t.is('once it is up, it is not sent again', w.ups.length, 2);

  w = world(['w1', 'gone1', 'gone2']);
  await w.sync();
  t.is('a workout deleted here is deleted there', w.dels, [['gone1', 'gone2']]);

  w = world(['w1', 'theirs']);
  w.cloud.pulled = false;
  await w.sync();
  t.is('before the first pull nothing is deleted or sent', [w.dels, w.ups, w.social.dirty], [[], [], true]);

  w = world([]);
  w.store.workouts.push({ id: 'w2', name: 'new' });
  await w.sync();
  t.is('a workout the cloud lacks goes up whatever its signature says', w.ups, [['w1:edited', 'w2:new']]);
  t.done();
})();
