/* Pieczątki co STAMP treningów i licznik rekordów miesiąca (słupki PRs):
   daty pieczątek idą od najstarszego treningu, a PR-y liczą się po jednym
   na ćwiczenie i rodzaj, tak jak linia "N new PRs" w raporcie. */
const { slice, suite, bwCode } = require('./lib');

const stampCode = slice('  var STAMP = 50;', '  function stampTag');
const prCode = slice('  function workoutPRs', '  // one list of records');
const t = suite('stamps');

const { STAMP, stampDates } = new Function(stampCode + '; return { STAMP: STAMP, stampDates: stampDates };')();

// workouts arrive newest first, like in the store; the dates are the proof of order
const mk = (n) => Array.from({ length: n }, (_, i) => ({ date: new Date(Date.UTC(2026, 0, 1) + (n - 1 - i) * 864e5).toISOString() }));
t.is('under one step there is no stamp', stampDates(mk(STAMP - 1)), []);
t.is('the stamp is the day of the STAMPth workout, counting from the oldest', stampDates(mk(STAMP)),
  [new Date(Date.UTC(2026, 0, STAMP)).toISOString()]);
t.is('one date per full step, a partial step adds none', stampDates(mk(STAMP * 2 + 7)).length, 2);
t.is('the input list is left in its order', (() => { const l = mk(STAMP); const first = l[0].date; stampDates(l); return l[0].date === first; })(), true);

const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const epley = (w, r) => (r > 0 ? w * (1 + r / 30) : 0);
const store = { workouts: [
  { date: '2026-03-10T10:00:00Z', exercises: [{ name: 'Bench', sets: [
    { weight: '80', reps: '5', prs: ['Weight', '1RM'] }, { weight: '70', reps: '8', prs: ['Weight'] }] }] },
  { date: '2026-03-20T10:00:00Z', exercises: [{ name: 'Squat', sets: [{ weight: '100', reps: '5', prs: ['Volume'] }] }] },
  { date: '2026-04-02T10:00:00Z', exercises: [{ name: 'Bench', sets: [{ weight: '90', reps: '3', prs: ['Weight'] }] }] }
] };
const pr = new Function('store', 'num', 'epley', 'effReps',
  bwCode() + prCode + '; return { prTotal: prTotal };')(
  store, num, epley, (st) => num(st.reps));
t.is('one PR per exercise and kind: Bench Weight+1RM, Squat Volume', pr.prTotal(new Date('2026-03-01'), new Date('2026-04-01')), 3);
t.is('a month with no records counts zero', pr.prTotal(new Date('2026-05-01'), new Date('2026-06-01')), 0);
t.is('the span is half open: the first of the next month is outside', pr.prTotal(new Date('2026-04-02T10:00:00Z'), new Date('2026-04-02T10:00:00Z')), 0);
t.done();
