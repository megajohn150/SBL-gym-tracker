/* Weekly targets: typing into the box must not cost a muscle its priority star. node tests/targets.js */
const { slice, suite } = require('./lib');
const t = suite('targets');

let store, saved;
const make = (targets) => { store = { targets }; saved = 0; };
const f = new Function('store', 'saveStore', slice('  var tgStar = {};', '  // typing straight into the field') +
  '; return { set: setTarget, reset: function () { tgStar = {}; } };')(
  new Proxy({}, { get: (_, k) => store[k], set: (_, k, v) => { store[k] = v; return true; } }), () => { saved++; });

// the box saves on every key: 12 -> 1 -> (empty) -> 1 -> 10
make({ Chest: { sets: 12, star: true } });
f.set('Chest', 'sets', 1);
t.is('a shorter number keeps the star', store.targets.Chest, { sets: 1, star: true });
f.set('Chest', 'sets', 0);
t.is('an emptied box drops it from the data, as clearing a goal always did', store.targets.Chest, undefined);
f.set('Chest', 'sets', 1);
t.is('typing a number straight after gives it back', store.targets.Chest, { sets: 1, star: true });
f.set('Chest', 'sets', 10);
t.is('and it stays through the rest of the typing', store.targets.Chest, { sets: 10, star: true });

// a goal left empty stays without a star
make({ Lats: { sets: 8, star: true } });
f.reset();
f.set('Lats', 'sets', 0);
f.reset();                                              // the screen was left
f.set('Lats', 'sets', 8);
t.is('a goal cleared and typed again after leaving the screen has no star', store.targets.Lats, { sets: 8 });

// other muscles and other fields are not touched
make({ Chest: { sets: 12, star: true }, Lats: { sets: 8 } });
f.reset();
f.set('Chest', 'sets', 0);
f.set('Lats', 'sets', 9);
t.is('a star is only given back to the muscle that lost it', store.targets.Lats, { sets: 9 });
f.set('Chest', 'days', 3);
t.is('days do not bring a star back or take one away', store.targets.Chest, { days: 3 });
f.set('Chest', 'sets', 14);
t.is('the goal typed again does', store.targets.Chest, { days: 3, sets: 14, star: true });
make({ Chest: { sets: 12, star: true, days: 3 } });
f.reset();
f.set('Chest', 'days', 0);
t.is('clearing the days keeps the star', store.targets.Chest, { sets: 12, star: true });
make({ Biceps: { sets: 6 } });
f.reset();
f.set('Biceps', 'sets', 0);
f.set('Biceps', 'sets', 7);
t.is('a muscle that never had a star does not get one', store.targets.Biceps, { sets: 7 });
t.is('every change is saved', saved > 0, true);
t.done();
