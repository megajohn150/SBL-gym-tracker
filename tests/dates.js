/* Weeks run Monday to Sunday, in the phone's own time. Every "how many weeks ago" has
   fallen over at the Monday boundary once already. node tests/dates.js */
const { slice, suite } = require('./lib');
const t = suite('dates');

const store = { workouts: [] };
const weekStreak = new Function('store', slice('  function weekStreak(list, at)', '  var calView') + '; return weekStreak;')(store);
const d = new Function('MONTHS', slice('  function monday(d)', '  // A shoulder exercise may name') +
  '; return { monday: monday, addDays: addDays, dmy: dmy };')(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

const at = new Date(2026, 10, 12, 15);                    // some afternoon in the middle of a week
const mon = d.monday(at);
const on = (days, ms) => ({ date: new Date(d.addDays(mon, days).getTime() + (ms || 0)).toISOString() });

t.is('Monday is midnight at the start of that week', [mon.getDay(), mon.getHours(), mon <= at, at - mon < 7 * 864e5], [1, 0, true, true]);
t.is('a Sunday belongs to the week that began six days earlier', d.monday(d.addDays(mon, 6)).getTime(), mon.getTime());
t.is('adding days crosses a month end', d.dmy(d.addDays(new Date(2026, 0, 30), 3)), '2 Feb 2026');

t.is('three weeks in a row', weekStreak([on(1), on(-3), on(-10)], at), 3);
t.is('an empty current week does not break it', weekStreak([on(-3), on(-10)], at), 2);
t.is('an empty last week does', weekStreak([on(1), on(-10)], at), 1);
t.is('two workouts in one week are one week', weekStreak([on(0), on(2), on(4)], at), 1);
t.is('nothing logged is no streak', weekStreak([], at), 0);
t.is('Monday 00:00 is this week, a millisecond earlier is last week', weekStreak([on(0), on(0, -1)], at), 2);
t.is('Sunday night still counts for the week it ends', weekStreak([on(6, 23 * 36e5)], at), 1);
t.is('asked as of an older week, later workouts are not that week\'s', weekStreak([on(-7), on(-14)], d.addDays(at, -7)), 2);
store.workouts = [on(1)];
t.is('with no list it reads the log', weekStreak(null, at), 1);
t.done();
