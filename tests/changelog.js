/* The change log: what is unread, and when the toast shows. The boot code is a few lines around
   chgStart; the rules are all in chgOf / chgNews / chgStart, sliced out of the page here.
   node tests/changelog.js */
const { slice, suite } = require('./lib');
const t = suite('changelog');

const src = slice('  function chgOf(', '  /* =========================================================\n     STORE');
function make(app, log) {
  return new Function('APP_VERSION', 'CHANGELOG',
    src + '; return { chgLast: chgLast, chgOf: chgOf, chgNews: chgNews, chgStart: chgStart };')(app, log);
}
const LOG = [['3.4480', 'd'], ['3.4479', 'c'], ['3.4477', 'b'], ['3.4475', 'a']];
const v = (list) => list.map((c) => c[0]);

let c = make('3.4479', LOG);
t.is('everything after the version last read, up to this one', v(c.chgNews('3.4475')), ['3.4479', '3.4477']);
t.is('a line keyed to a later version is not shown yet', v(c.chgNews('3.4470')), ['3.4479', '3.4477', '3.4475']);
t.is('nothing is unread once the current version was read', v(c.chgNews('3.4479')), []);
t.is('a version with no line of its own is simply skipped', v(c.chgOf('3.4478')), []);
t.is('chgOf finds exactly the current one', v(c.chgOf('3.4479')), ['3.4479']);

t.is('the number in Settings lists up to this version, newest first', v(c.chgLast()), ['3.4479', '3.4477', '3.4475']);
const many = Array.from({ length: 12 }, (_, i) => ['3.' + (4600 - i), 'x']);
t.is('and no more than ten', make('3.4600', many).chgLast().length, 10);

// the reported case: several refreshes without opening the toast, then a new version
c = make('3.4477', LOG);
let s = c.chgStart('3.4475', null);   // an old device: no tracker-chg yet, so it starts from what it ran
t.is('an old device is shown what came after the version it ran', [v(s.news), s.toast, s.list, s.base], [['3.4477'], true, true, '3.4475']);
// refreshed on the same version without tapping: the toast is gone, the list is not
s = c.chgStart('3.4477', '3.4475');
t.is('a plain refresh brings no toast but keeps the unread', [v(s.news), s.toast], [['3.4477'], false]);
c = make('3.4479', LOG);
s = c.chgStart('3.4477', '3.4475');
t.is('a later version lists what was missed and what is new', [v(s.news), s.toast], [['3.4479', '3.4477'], true]);
s = c.chgStart('3.4479', '3.4479');
t.is('after opening it, nothing is left', [v(s.news), s.list], [[], false]);
c = make('3.4480', LOG);
s = c.chgStart('3.4479', '3.4479');
t.is('and the next version lists only itself', [v(s.news), s.toast], [['3.4480'], true]);

s = c.chgStart(null, null);
t.is('a fresh install has nothing unread and no toast', [v(s.news), s.toast, s.base], [[], false, '3.4480']);
// a version without a line of its own
c = make('3.4478', LOG);
s = c.chgStart('3.4477', '3.4477');
t.is('a new version with no line and nothing missed is a plain toast', [s.toast, s.list], [true, false]);
t.is('a new version with no line still lists what was missed', c.chgStart('3.4477', '3.4475').list, true);
t.done();
