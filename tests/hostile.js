/* What a friend's own JSON may do to you: a set count, a weight step and a post are
   all drawn as markup or looped over, so each is forced to what the app could have
   written itself. node tests/hostile.js */
const { slice, suite } = require('./lib');
const t = suite('hostile');

const clean = new Function(slice('  function cleanSets(v)', '  function fixCues()') +
  '; return { cleanSets: cleanSets, cleanStep: cleanStep };')();
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
t.done();
