/* The feed cache: a second look downloads nothing it already holds, an edit comes
   down again, a deleted post disappears, and a failed look leaves the feed alone. */
const { slice, suite } = require('./lib');

const code = slice('  function loadFeed(more) {', '  function loadSocial() {');
const postOk = new Function(slice('  function postOk(w)', '  function workoutCard') + '; return postOk;')();
const t = suite('feed');

function world() {
  const mem = {};
  const db = [
    { user_id: 'u1', id: 'a', date: '2026-11-03', updated_at: 't1', data: { name: 'A', exercises: [] } },
    { user_id: 'u1', id: 'b', date: '2026-11-02', updated_at: 't1', data: { name: 'B', exercises: [] } }
  ];
  const w = { fullFetches: [], fail: false, db, mem };
  const sb = {
    from(table) {
      const q = { cols: '', ids: null, users: null };
      q.select = (c) => { q.cols = c; return q; };
      q.in = (col, v) => { (col === 'id' ? (q.ids = v) : (q.users = v)); return q; };
      q.order = () => q;
      q.range = () => q;
      q.then = (ok) => Promise.resolve().then(() => {
        if (table === 'profiles') return { data: [] };
        if (w.fail) return { error: { message: 'offline' } };
        const rows = db.filter((r) => (!q.ids || q.ids.includes(r.id)));
        if (q.cols.includes('data')) w.fullFetches.push(rows.map((r) => r.id).join(','));
        return { data: rows.map((r) => Object.assign({}, r)) };
      }).then(ok);
      return q;
    }
  };
  const ctx = { sb, me: { id: 'me' }, social: { feed: [], people: {}, more: false }, FEED_PAGE: 60,
    friendIds: () => ['u1'], postOk, drawHome() {}, loadReacts() {},
    load: (k) => mem[k] || null, save: (k, v) => { mem[k] = v; } };
  const run = new Function(...Object.keys(ctx), code + '; return loadFeed;')(...Object.values(ctx));
  return { w, social: ctx.social, loadFeed: run };
}

(async () => {
  const x = world();
  await x.loadFeed();
  t.is('the first look downloads everything', [x.social.feed.map((p) => p.name), x.w.fullFetches], [['A', 'B'], ['a,b']]);
  await x.loadFeed();
  t.is('the second one downloads nothing', x.w.fullFetches.length, 1);

  x.w.db[0].updated_at = 't2'; x.w.db[0].data = { name: 'A edited', exercises: [] };
  await x.loadFeed();
  t.is('an edited post comes down again, alone', [x.social.feed[0].name, x.w.fullFetches[1]], ['A edited', 'a']);

  x.w.db.shift();
  await x.loadFeed();
  t.is('a deleted post is gone', x.social.feed.map((p) => p.name), ['B']);

  x.w.db.unshift({ user_id: 'u1', id: 'c', date: '2026-11-05', updated_at: 't1', data: { name: 'C', exercises: [] } });
  await x.loadFeed();
  t.is('a new post is added in date order', [x.social.feed.map((p) => p.name), x.w.fullFetches[2]], [['C', 'B'], 'c']);

  x.w.fail = true;
  await x.loadFeed();
  t.is('a failed look keeps what was there', x.social.feed.map((p) => p.name), ['C', 'B']);
  t.done();
})();
