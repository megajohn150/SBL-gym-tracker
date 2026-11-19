/* The dot after the Feed tab: a friend's session not yet shown on the Feed. node tests/feeddot.js */
const { slice, suite } = require('./lib');
const t = suite('feeddot');
const mk = () => {
  const mem = {}, cls = { feednew: false }, st = { screen: 's-dash' }, social = { feed: [] };
  const tab = { classList: { toggle: (c, on) => { cls[c] = !!on; } } };
  const doc = { querySelector: () => tab };
  const f = new Function('document', 'me', 'social', 'load', 'save', 'current',
    slice('  function drawFeedDot()', '  function drawHome()') + '; return drawFeedDot;')(
    doc, { id: 'u' }, social, (k) => mem[k] || null, (k, v) => { mem[k] = v; }, () => st.screen);
  return { f, cls, st, social };
};
const post = (by, id) => ({ by, id });
let m = mk();
m.social.feed = [post('a', '1')]; m.f();
t.is('the first run counts what is there as seen', m.cls.feednew, false);
m.social.feed = [post('a', '2'), post('a', '1')]; m.f();
t.is('a new friend post lights it off the Feed', m.cls.feednew, true);
m.f();
t.is('it stays lit until the Feed is looked at', m.cls.feednew, true);
m.st.screen = 's-home'; m.f();
t.is('the Feed being open clears it', m.cls.feednew, false);
m.st.screen = 's-dash'; m.f();
t.is('and it stays clear', m.cls.feednew, false);
m.social.feed = [post('u', '9'), post('a', '2'), post('a', '1')]; m.f();
t.is('my own session never lights it', m.cls.feednew, false);
t.done();
