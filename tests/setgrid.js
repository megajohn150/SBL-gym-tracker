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
const f = new Function('store', 'MUSCLE_CELL', 'HEADS', 'monday', 'addDays', 'statsFor',
  slice('  function setsTrend(', '  // the grid above the week picker') + '; return { trend: setsTrend, state: ssState };')(store, MUSCLE_CELL, HEADS, monday, addDays, statsFor);

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
t.done();
