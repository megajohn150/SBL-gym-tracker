/* A stand-in for supabase-js, for driving the social screens in a browser without
   signing in. `node tests/fake-page.js` inlines it into public/__t.html.
   window.DB holds the tables (me = 'me', friends f1..f4, mutual follows, a post each,
   profiles.stats.records for the leaderboards); change DB.live_session and call
   window.__ping('sess') to play a friend starting, changing or ending a workout. */
(function () {
  var now = Date.now(), day = 864e5;
  function iso(n) { return new Date(now - n * day).toISOString(); }
  function st(w, r, i, n) { return { label: n || '01', weight: String(w), reps: String(r), rir: String(i), done: true }; }
  function ex(id, name, muscle, sets) { return { exId: id, name: name, muscle: muscle, unilateral: false, sets: sets }; }
  var E = [
    { id: 'e1', name: 'Bench Press', code: 'BP', muscle: 'Chest', head: '', cue: '', unilateral: false },
    { id: 'e2', name: 'Squat', code: 'SQ', muscle: 'Quads', head: '', cue: '', unilateral: false },
    { id: 'e3', name: 'Row', code: 'RW', muscle: 'Lats', head: '', cue: '', unilateral: false },
    { id: 'e4', name: 'Curl', code: 'CU', muscle: 'Biceps', head: '', cue: '', unilateral: false }];
  function mkW(i, d) {
    return { id: 'w' + i, name: 'Push', note: '', date: iso(d), seconds: 3600, routineId: null, exercises: [
      ex('e1', 'Bench Press', 'Chest', [st(80 + i, 8, 1), st(80, 8, 2, '02')]), ex('e2', 'Squat', 'Quads', [st(100, 5, 1)]),
      ex('e3', 'Row', 'Lats', [st(60, 10, 2)]), ex('e4', 'Curl', 'Biceps', [st(20, 10, 1)])] };
  }
  var STORE = { exercises: E, routines: [], workouts: [1, 3, 5, 8, 10].map(function (d, i) { return mkW(i, d); }),
    gone: [], targets: {}, profile: { name: 'Me', bio: '', pic: null } };
  var rec = { 'bench press': 0, squat: 120, row: 70, curl: 25 };
  function prof(id, name, bench) {
    var r = { 'bench press': [bench, bench * 1.3, bench * 8], squat: [120, 140, 600], row: [70, 90, 700] };
    return { user_id: id, username: name, name: name, bio: '', pic: null, stats: { workouts: 5, streak: 1, records: r } };
  }
  var F = [['f1', 'alpha', 70], ['f2', 'bravo', 60], ['f3', 'charlie', 75], ['f4', 'delta', 50]];
  var follows = [];
  F.forEach(function (f) { follows.push({ follower: 'me', followee: f[0], created_at: iso(30) }, { follower: f[0], followee: 'me', created_at: iso(30) }); });
  var posts = [];
  F.forEach(function (f, i) {
    posts.push({ user_id: f[0], id: 'p' + i, date: iso(2 + i), data: { name: 'Pull', note: '', seconds: 3000, records: 0,
      exercises: [ex('x1', 'Bench Press', 'Chest', [st(f[2], 8, 1)]), ex('x2', 'Row', 'Lats', [st(60, 10, 2)])] } });
  });
  window.DB = {
    tracker: [{ user_id: 'me', data: STORE, session: null, rev: 1 }],
    profiles: [{ user_id: 'me', username: 'me', name: 'Me', bio: '', pic: null, stats: { workouts: 5, streak: 1, records: {} } }]
      .concat(F.map(function (f) { return prof(f[0], f[1], f[2]); })),
    follows: follows, posts: posts, library: [], live_session: [], likes: [], comments: [], push_subs: [], push_jobs: []
  };
  function Q(t) { this.t = t; this.f = []; this.m = 'select'; this.cols = ''; this.opt = {}; }
  var P = Q.prototype;
  P.select = function (c, o) { if (this.m === 'select') { this.cols = c; this.opt = o || {}; } return this; };
  P.eq = function (c, v) { this.f.push(function (r) { return r[c] === v; }); return this; };
  P.in = function (c, v) { this.f.push(function (r) { return v.indexOf(r[c]) >= 0; }); return this; };
  P.gte = function (c, v) { this.f.push(function (r) { return String(r[c]) >= String(v); }); return this; };
  P.ilike = P.neq = P.not = P.lt = function () { return this; };
  P.order = function (c, o) { this.o = [c, o && o.ascending]; return this; };
  P.range = function (a, b) { this.r = [a, b]; return this; };
  P.limit = function (n) { this.r = [0, n - 1]; return this; };
  P.maybeSingle = P.single = function () { this.one = true; return this; };
  P.upsert = function (p, o) { this.m = 'upsert'; this.pl = p; this.oc = o && o.onConflict; return this; };
  P.insert = function (p) { this.m = 'insert'; this.pl = p; return this; };
  P.update = function (p) { this.m = 'update'; this.pl = p; return this; };
  P.delete = function () { this.m = 'delete'; return this; };
  P.then = function (ok, bad) { return Promise.resolve().then(run.bind(this)).then(ok, bad); };
  function run() {
    var self = this, rows = DB[this.t] || (DB[this.t] = []);
    function match(r) { return self.f.every(function (f) { return f(r); }); }
    var out;
    if (this.m === 'delete') { DB[this.t] = rows.filter(function (r) { return !match(r); }); return { data: null, error: null }; }
    if (this.m === 'upsert' || this.m === 'insert') {
      var keys = (this.oc || 'user_id,id').split(','); out = [];
      [].concat(this.pl).forEach(function (p) {
        var at = -1;
        if (self.m === 'upsert') rows.forEach(function (r, j) { if (keys.every(function (k) { return r[k] === p[k]; })) at = j; });
        if (at >= 0) { Object.keys(p).forEach(function (k) { rows[at][k] = p[k]; }); out.push(rows[at]); }
        else { rows.push(p); out.push(p); }
      });
      return { data: this.one ? out[0] || null : out, error: null };
    }
    if (this.m === 'update') {
      out = rows.filter(match);
      out.forEach(function (r) { Object.keys(self.pl).forEach(function (k) { r[k] = self.pl[k]; }); });
      return { data: this.one ? out[0] || null : out, error: null };
    }
    out = rows.filter(match);
    if (this.o) { var c = this.o[0], asc = this.o[1]; out = out.slice().sort(function (a, b) { return (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1); }); }
    if (this.r) out = out.slice(this.r[0], this.r[1] + 1);
    if (this.opt.count) return { count: out.length, data: this.opt.head ? null : out, error: null };
    var m = /(\w+):data->(\w+)/.exec(this.cols || '');
    if (m) out = out.map(function (r) { var o = { date: r.date }; o[m[1]] = r.data[m[2]]; return o; });
    return { data: this.one ? out[0] || null : out, error: null };
  }
  var handler = null;
  var client = {
    auth: { getSession: function () { return Promise.resolve({ data: { session: { user: { id: 'me', email: 't@test.local' } } } }); },
      onAuthStateChange: function () {}, signOut: function () { return Promise.resolve(); } },
    from: function (t) { return new Q(t); },
    realtime: { setAuth: function () { return Promise.resolve(); } },
    channel: function () {
      var ch = { on: function (a, b, fn) { handler = fn; return ch; }, subscribe: function (cb) { setTimeout(function () { cb('SUBSCRIBED'); }); return ch; } };
      return ch;
    },
    removeChannel: function () {}
  };
  window.supabase = { createClient: function () { return client; } };
  window.__ping = function (k) { handler && handler({ payload: { k: k } }); };
})();
