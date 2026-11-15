/* What a friend's own JSON may do to you: a set count, a weight step and a post are
   all drawn as markup or looped over, so each is forced to what the app could have
   written itself. node tests/hostile.js */
const { slice, suite } = require('./lib');
const t = suite('hostile');

const clean = new Function(slice('  function cleanSets(v)', '  function fixCues()') +
  '; return { cleanSets: cleanSets, cleanStep: cleanStep, cleanN: cleanN };')();
const post = new Function(slice('  function prN(w)', '  function workoutCard') +
  '; return { prN: prN, postOk: postOk };')();

t.is('a count of a billion is twelve sets', clean.cleanSets(999999999), 12);
t.is('markup in the count is one set', clean.cleanSets('<img src=x onerror=alert(1)>'), 1);
t.is('a normal count stays', clean.cleanSets(4), 4);
t.is('a numeric string is read as a number', clean.cleanSets('3'), 3);
t.is('a step with markup is dropped', clean.cleanStep('1" autofocus onfocus="x'), 0);
t.is('a sane step stays', clean.cleanStep(2.5), 2.5);
t.is('a negative step is dropped', clean.cleanStep(-1), 0);
t.is('records with markup count as none', post.prN({ records: '<b>1</b>' }), 0);
t.is('records stay a number', post.prN({ records: 3 }), 3);
t.is('a post whose exercises are no list is not drawn', post.postOk({ exercises: 'x' }), false);
t.is('a post whose sets are no list is not drawn', post.postOk({ exercises: [{ sets: null }] }), false);
t.is('a set without a text label is not drawn', post.postOk({ exercises: [{ sets: [{ label: 5 }] }] }), false);
t.is('a proper post is drawn', post.postOk({ exercises: [{ sets: [{ label: '01' }] }] }), true);

/* a profile row is readable by every account, so its numbers are a stranger's */
t.is('markup in a workout count is zero', clean.cleanN('<img src=x onerror=alert(1)>'), 0);
t.is('a count stays a whole number', [clean.cleanN(212), clean.cleanN('37.9'), clean.cleanN(-4), clean.cleanN(null)], [212, 37, 0, 0]);

/* an exercise out of a friend's library becomes one of yours */
const lentEx = new Function('uid', 'deriveCode', 'cleanStep', slice('  function lentEx(src)', '  function applyFollow') +
  '; return lentEx;')(() => 'id1', (n) => n.slice(0, 2).toUpperCase(), clean.cleanStep);
const lent = lentEx({ name: 42, code: { a: 1 }, muscle: ['x'], head: null, cue: 7, unilateral: 'yes', step: '<b>' });
t.is('every field of it is the type the app writes', [typeof lent.name, typeof lent.code, typeof lent.muscle, typeof lent.head, typeof lent.cue, lent.unilateral, 'step' in lent],
  ['string', 'string', 'string', 'string', 'string', true, false]);
t.is('so its name can be lowercased like any other', lent.name.toLowerCase(), '42');
t.is('a proper exercise comes through as it is', lentEx({ name: 'Row', code: 'RW', muscle: 'Lats', cue: 'pull', step: 2.5 }),
  { id: 'id1', name: 'Row', code: 'RW', muscle: 'Lats', head: '', cue: 'pull', unilateral: false, step: 2.5 });
t.is('a name of a thousand letters is cut', lentEx({ name: 'x'.repeat(1000) }).name.length, 80);

const medal = new Function(slice('  function medal(st, name)', '  // A ticked set that breaks a record') + '; return medal;')();
t.is('a set whose records are no list draws no medal', [medal({ prs: 'Weight' }, 'x'), medal({ prs: { length: 3 } }, 'x'), medal({}, 'x')], ['', '', '']);
t.done();
