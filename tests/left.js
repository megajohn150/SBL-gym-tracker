/* The "~35 min left" cell: the pace of today's rounds, held up by the routine's history early on, a chat left out.
   node tests/left.js */
const { slice, suite } = require('./lib');
const t = suite('left');
const pad2 = (n) => (n < 10 ? '0' + n : String(n));
const { sessLeft, fmtLeft } = new Function('pad2', slice('  function sessLeft(', '  // a tick gets its time') + '; return { sessLeft: sessLeft, fmtLeft: fmtLeft };')(pad2);
const T0 = 1e12, M = 60e3;
// one exercise, `ticks` are the minutes (since T0) at which the first sets were ticked, `total` sets in all
const sess = (ticks, total, uni) => ({ startedAt: T0, exercises: [{ unilateral: !!uni, sets: Array.from({ length: total }, (_, i) =>
  ({ label: uni ? (i % 2 ? 'R' : 'L') + (Math.floor(i / 2) + 1) : '0' + (i + 1), done: i < ticks.length, doneAt: i < ticks.length ? T0 + ticks[i] * M : 0 })) }] });
const min = (s) => Math.round(s / 60);

t.is('nothing ticked and no history: no number', sessLeft(sess([], 10), 0, T0), null);
t.is('one gap is not a pace yet', sessLeft(sess([5, 8], 10), 0, T0 + 8 * M), null);
t.is('three gaps of 3 min with 7 sets to go: 21 min', min(sessLeft(sess([3, 6, 9, 12], 11), 0, T0 + 12 * M)), 21);
t.is('the time since the last tick comes off, up to one round', min(sessLeft(sess([3, 6, 9, 12], 11), 0, T0 + 14 * M)), 19);
t.is('history alone carries a start: 10 rounds at 4 min', min(sessLeft(sess([], 10), 240, T0)), 40);
// 4 ticks at a steady 3 min with a 10 min chat in the middle: the chat is left out
t.is('a chat in the middle does not slow the pace', min(sessLeft(sess([3, 6, 9, 22, 25, 28], 12), 0, T0 + 28 * M)), 18);
t.is('all ticked: nothing to estimate', sessLeft(sess([1, 2, 3], 3), 0, T0 + 3 * M), null);
t.is('a unilateral pair counts once: 3 of 4 rounds done, 3 min a round', min(sessLeft(sess([2, 2.01, 5, 5.01, 8, 8.01], 8, true), 0, T0 + 8.01 * M)), 3);
t.is('formats', [fmtLeft(30), fmtLeft(35 * 60), fmtLeft(70 * 60), fmtLeft(120 * 60)], ['<1 min', '~35 min', '~1h 10m', '~2h 00m']);
t.done();
