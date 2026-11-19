/* Side balance: which side of a one-sided exercise is stronger, by how much, and which goes first.
   node tests/sides2.js */
const { slice, suite } = require('./lib');
const t = suite('sides2');
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const logged = (st) => num(st.reps) > 0;
const recOrm = (st) => num(st.weight) * (1 + num(st.reps) / 30);
const dmy = (d) => d.toISOString().slice(0, 10);
const { sideBalance, sideHtml } = new Function('logged', 'recOrm', 'dmy',
  slice('  function sideBalance(', '  function openSides(') + '; return { sideBalance: sideBalance, sideHtml: sideHtml };')(logged, recOrm, dmy);
// a session: left and right sets as [weight, reps]
const ses = (day, L, R, live) => ({ live: live !== false, w: { date: '2026-03-' + day + 'T10:00:00Z' },
  e: { sets: [].concat(L.map((s, i) => ({ label: 'L' + (i + 1), weight: s[0], reps: s[1] })), R.map((s, i) => ({ label: 'R' + (i + 1), weight: s[0], reps: s[1] }))) } });

t.is('no rows: nothing to say', sideBalance([]), null);
t.is('one side only is not a comparison', sideBalance([ses('10', [[20, 10]], [])]), null);
let s = sideBalance([ses('12', [[20, 10]], [[22, 10]]), ses('05', [[20, 10]], [[22, 10]])]);
t.is('the right is 10% stronger, so it is the left that starts', [s.pct, s.strong], [10, 'R']);
s = sideBalance([ses('12', [[22, 10]], [[20, 10]])]);
t.is('the left stronger', [s.pct, s.strong], [10, 'L']);
s = sideBalance([ses('12', [[20, 10]], [[20.2, 10]])]);
t.is('under 2% is even', s.strong, '');
t.is('a set with no reps is not a set', sideBalance([ses('12', [[20, 10]], [[50, 0]])]), null);
t.is('a session before a reset does not count', sideBalance([ses('12', [[20, 10]], [[22, 10]], false)]), null);
const many = []; for (let i = 20; i >= 1; i--) many.push(ses(String(i).padStart(2, '0'), [[20, 10]], [[22, 10]]));
t.is('only the latest six sessions are read', sideBalance(many).list.length, 6);
t.is('the verdict names the weaker side first', sideHtml([ses('12', [[20, 10]], [[22, 10]])]).includes('Start with your left'), true);
t.is('and says nothing until there is data', sideHtml([]).includes('Not enough yet'), true);
t.done();
