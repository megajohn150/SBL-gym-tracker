/* The goal grid above the week picker on Set count: sets per muscle with a goal, for the last weeks. node tests/setgrid.js */
const { slice, suite } = require('./lib');
const t = suite('setgrid');

const store = { targets: {} };
const MUSCLE_CELL = { Chest: 1, Lats: 1, Shoulders: 1, Biceps: 1 };
const HEADS = ['Front delt', 'Side delt', 'Rear delt'];
const monday = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
let weekly;                                            // weekly[k] answers the week k weeks back; statsFor is stubbed
const now = new Date(2026, 10, 18);                    // a Wednesday: this week starts Mon 16 Nov
const statsFor = (from) => weekly[Math.round((monday(now) - from) / 6048e5)] || { by: {}, heads: {} };
const f = new Function('store', 'MUSCLE_CELL', 'HEADS', 'monday', 'addDays', 'statsFor', 'load',
  slice('  var SS_MIN', '  // the grid above the week picker') + '; return { trend: setsTrend, state: ssState, order: ssOrder, clamp: ssClamp, weeks: function () { return ssWeeks; } };')(store, MUSCLE_CELL, HEADS, monday, addDays, statsFor, () => null);

weekly = {
  0: { by: { Chest: 4, Lats: 0, Shoulders: 3, Biceps: 0 }, heads: { 'Front delt': 1, 'Side delt': 2, 'Rear delt': 0 } },
  1: { by: { Chest: 9, Lats: 6, Shoulders: 0, Biceps: 2 }, heads: { 'Front delt': 0, 'Side delt': 0, 'Rear delt': 0 } },
  2: { by: { Chest: 12, Lats: 0, Shoulders: 0, Biceps: 0 }, heads: {} }
};
const g = f.trend(3, now);
t.is('only muscles with a weekly set goal are rows: nothing to reach, nothing to miss', g.rows, []);
store.targets = { 'Rear delt': { sets: 8 }, Chest: { sets: 10 }, Biceps: { sets: 'x' }, Lats: { sets: 0 } };
const g2 = f.trend(3, now);
t.is('the weeks run oldest first, this week last', g2.weeks.map((w) => [w.off, w.from.getDate()]), [[2, 2], [1, 9], [0, 16]]);
t.is('a row is a muscle, its goal and one number a week', g2.rows.find((r) => r.name === 'Chest'), { name: 'Chest', goal: 10, vals: [12, 9, 4] });
t.is('a goal that is not a number or is zero is none: no row', g2.rows.map((r) => r.name), ['Chest', 'Rear delt']);
t.is('a muscle with a goal and no sets stays, as zeros', g2.rows.find((r) => r.name === 'Rear delt'), { name: 'Rear delt', goal: 8, vals: [0, 0, 0] });
store.targets = { 'Side delt': { sets: 4 }, Shoulders: { sets: 9 } };
t.is('the shoulder stands for its heads: a head is counted by its own number', f.trend(3, now).rows, [{ name: 'Side delt', goal: 4, vals: [0, 0, 2] }]);
store.targets = { Chest: { sets: 10 }, 'Rear delt': { sets: 8 } };
weekly = { 0: { by: { Chest: '5', Lats: null }, heads: {} } };
t.is('numbers that arrive as text are numbers', f.trend(1, now).rows, [{ name: 'Chest', goal: 10, vals: [5] }, { name: 'Rear delt', goal: 8, vals: [0] }]);
t.is('one week asks for one column', f.trend(1, now).weeks.length, 1);
t.is('the weeks before the first workout are marked, the others not', f.trend(3, now, new Date(2026, 10, 10)).weeks.map((w) => w.before), [true, false, false]);
t.is('with no first workout nothing is before it', f.trend(2, now, null).weeks.map((w) => w.before), [false, false]);
const wk = (off, before) => ({ off, before: !!before });
t.is('a goal reached is a hit, this week or any other', [f.state(10, 10, wk(3)), f.state(12, 10, wk(0))], ['hit', 'hit']);
t.is('a finished week short of it is a miss, but this one is still open', [f.state(9, 10, wk(2)), f.state(0, 10, wk(1)), f.state(9, 10, wk(0))], ['miss', 'miss', 'pend']);
t.is('a week before your first workout is neither', [f.state(0, 10, wk(5, true)), f.state(20, 10, wk(5, true))], ['none', 'none']);

// the weeks the grid holds
t.is('the grid holds 12 weeks until chosen otherwise', f.weeks(), 12);
t.is('a choice is kept within 2 to 12', [f.clamp(2), f.clamp(7), f.clamp(12), f.clamp(1), f.clamp(0.4), f.clamp(13), f.clamp(99)], [2, 7, 12, 2, 12, 12, 12]);
t.is('and what is saved as text is read as a number', [f.clamp('5'), f.clamp('5.6'), f.clamp(' 3 ')], [5, 6, 3]);
t.is('nothing saved, or not a number, is the full 12', [f.clamp(null), f.clamp(undefined), f.clamp('x'), f.clamp(''), f.clamp(-3), f.clamp(NaN)], [12, 12, 12, 12, 12, 12]);

// which muscles lead when the grid is folded
const mk = (name, goal, vals) => ({ name, goal, vals });
const wks = [3, 2, 1, 0].map((off) => ({ off, before: false }));
const grid = { weeks: wks, rows: [mk('Chest', 10, [10, 10, 10, 1]), mk('Lats', 8, [0, 0, 8, 1]), mk('Quads', 6, [0, 0, 0, 0]), mk('Biceps', 5, [5, 0, 5, 0])] };
store.targets = {};
t.is('the muscles that missed most come first (3, 2, 1 and 0 misses here: this week is still open)', f.order(grid).map((r) => r.name), ['Quads', 'Lats', 'Biceps', 'Chest']);
store.targets = { Chest: { sets: 10, star: true } };
t.is('a priority leads, whatever it missed', f.order(grid).map((r) => r.name)[0], 'Chest');
t.is('the grid keeps its own order', grid.rows.map((r) => r.name), ['Chest', 'Lats', 'Quads', 'Biceps']);
t.is('this week, still open, is not a miss, nor is a week before you began', f.order({ weeks: [{ off: 1, before: true }, { off: 0, before: false }], rows: [mk('A', 5, [0, 0]), mk('B', 5, [0, 9])] }).map((r) => r.name), ['A', 'B']);
t.done();
