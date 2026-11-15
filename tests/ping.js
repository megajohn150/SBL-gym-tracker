/* One channel carries a friend's reactions and the database's news. Switching the
   reactions off must silence the first and nothing else. node tests/ping.js */
const { slice, suite } = require('./lib');
const code = slice('  function livePing(m)', '  function liveOn() {');
const t = suite('ping');

function hear(noReact, kinds) {
  const got = [];
  const ping = new Function('store', 'likePop', 'watchOn', 'watchOff', 'liveHit', 'esc', 'FLEX_ON', code + '; return livePing;')(
    { profile: { noReact } }, (n, icon) => got.push('pop:' + n + (icon ? ':' + icon : '')),
    (n) => got.push('eyes:' + n), (n) => got.push('left:' + n), (k) => got.push('hit:' + k), (s) => s.replace(/</g, '&lt;'), 'FLEX');
  kinds.forEach((k) => ping(typeof k === 'string' ? { payload: { k, n: 'ann', t: '<b>hi' } } : k));
  return got;
}

const news = ['post', 'react', 'prof', 'lib', 'sess', 'foll', 'data:7'];
t.is('the database\'s news is queued', hear(false, news), news.map((k) => 'hit:' + k));
t.is('and still is with reactions switched off', hear(true, news), news.map((k) => 'hit:' + k));
t.is('reactions are shown, not queued', hear(false, ['like', 'flex', 'look', 'leave']), ['pop:ann', 'pop:ann:FLEX', 'eyes:ann', 'left:ann']);
t.is('switched off, none of them shows; a leave still clears the eyes', hear(true, ['like', 'flex', 'say', 'look', 'leave']), ['left:ann']);
t.is('a word from a friend is escaped', hear(false, ['say']), ['pop:ann:<span class="saytxt">&lt;b>hi</span>']);
t.is('a ping with nothing in it is a reaction to reload', hear(false, [{}, null]), ['hit:react', 'hit:react']);
t.done();
