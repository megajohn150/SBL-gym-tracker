/* The dock card says where the workout stands: the exercise's short code and its rounds ticked. node tests/dock.js */
const { slice, suite } = require('./lib');
const t = suite('dock');

const initials = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
const f = new Function('initials', slice('  function dockProgress(', '  function drawDock()') + '; return dockProgress;')(initials);
const sets = (...d) => d.map((x) => (x ? { done: true } : {}));
const ex = (o) => Object.assign({ name: 'Pec Deck', code: 'PD', unilateral: false, sets: sets(1, 0) }, o);

t.is('the code, the sets ticked and the sets planned', f({ idx: 0, exercises: [ex()] }), { code: 'PD', done: 1, total: 2 });
t.is('nothing ticked yet', f({ idx: 0, exercises: [ex({ sets: sets(0, 0, 0) })] }), { code: 'PD', done: 0, total: 3 });
t.is('all ticked', f({ idx: 0, exercises: [ex({ sets: sets(1, 1, 1) })] }), { code: 'PD', done: 3, total: 3 });
t.is('it is the exercise the workout stands at', f({ idx: 1, exercises: [ex(), ex({ name: 'Row', code: 'RW', sets: sets(1, 1, 1, 0) })] }), { code: 'RW', done: 3, total: 4 });
t.is('without a code, the initials of the name', f({ idx: 0, exercises: [ex({ code: '', name: 'Incline Bench Press' })] }).code, 'IB');
t.is('a one-sided pair is one round: both sides ticked', f({ idx: 0, exercises: [ex({ unilateral: true, sets: sets(1, 1, 1, 0, 0, 0) })] }), { code: 'PD', done: 1, total: 3 });
t.is('one side of a round is not the round', f({ idx: 0, exercises: [ex({ unilateral: true, sets: sets(1, 0, 0, 0) })] }), { code: 'PD', done: 0, total: 2 });
t.is('two rounds, both sides', f({ idx: 0, exercises: [ex({ unilateral: true, sets: sets(1, 1, 1, 1) })] }), { code: 'PD', done: 2, total: 2 });
t.is('on the closing card there is nothing to say', f({ idx: 1, exercises: [ex()] }), null);
t.is('an empty workout has nothing either', f({ idx: 0, exercises: [] }), null);
t.is('nor has an exercise that is skipped', f({ idx: 0, exercises: [ex({ skipped: true })] }), null);
t.is('nor one without sets', f({ idx: 0, exercises: [ex({ sets: [] })] }), null);
t.is('no workout, no answer', f(null), null);
t.done();
