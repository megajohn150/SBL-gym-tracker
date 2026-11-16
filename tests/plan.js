/* The plan: a routine for each weekday. What a day shows, what comes next, how a calendar day is
   marked, and how the plan travels between devices. node tests/plan.js */
const { slice, suite, planClean } = require('./lib');
const t = suite('plan');

const dates = slice('  function monday(d)', '  function dmy(d)');
const code = slice('  var PLAN_DAYS', '  /* --- Home draws --- */');
const merge = new Function(planClean() + slice('  function mergeStores(local, remote)', '  function redrawAll()') +
  '; return { mergeStores: mergeStores, unionStores: unionStores };')();
function make(store, runs) {
  return new Function('store', 'routineById', 'runsOf', dates + code +
    '; return { planShort: planShort, planName: planName, cleanPlan: cleanPlan, planAt: planAt, planNext: planNext, lastRun: lastRun, planCell: planCell, planDaysOf: planDaysOf };')(
    store, (id) => store.routines.filter((r) => r.id === id)[0], runs || (() => []));
}

const R = [{ id: 'pull', name: 'Pull' }, { id: 'legs', name: 'Legs' }];
const WED = new Date(2026, 10, 18, 12);                 // a Wednesday
const day = (n) => new Date(2026, 10, n, 9);

let a = make({ routines: R, plan: ['pull', '', '', '', 'legs', '', ''] });
t.is('a plan is seven ids, anything else is no plan', [a.cleanPlan(null), a.cleanPlan(['a']), a.cleanPlan({}), a.cleanPlan('x')], [undefined, undefined, undefined, undefined]);
t.is('an entry that is not text becomes a rest day', a.cleanPlan(['a', 1, null, {}, 'b', '', 'c']), ['a', '', '', '', 'b', '', 'c']);
t.is('a day with a routine, a rest day, a deleted routine', [a.planAt(0).id, a.planAt(1), make({ routines: [], plan: ['gone', '', '', '', '', '', ''] }).planAt(0)], ['pull', null, null]);
t.is('no plan at all is no routine on any day', make({ routines: R }).planAt(0), null);

t.is('next up looks ahead from today', (() => { const n = a.planNext(WED); return [n.r.id, n.ahead]; })(), ['legs', 2]);
t.is('and wraps round the weekend to Monday', (() => { const n = a.planNext(new Date(2026, 10, 21, 12)); return [n.r.id, n.ahead]; })(), ['pull', 2]);
t.is('from Sunday, Monday is tomorrow', a.planNext(new Date(2026, 10, 22, 12)).ahead, 1);
t.is('a plan of rest days has no next', make({ routines: R, plan: ['', '', '', '', '', '', ''] }).planNext(WED), null);
t.is('a short name is left alone', [a.planName('Push'), a.planName('Posterior'), a.planName('Full body A!!!')], ['Push', 'Posterior', 'Full body A!!!']);
t.is('a long one is cut at a whole word', [a.planName('Anterior upper body and arms'), a.planName('Upper body push day'), a.planName('Supercalifragilistic')], ['Anterior upper\u2026', 'Upper body\u2026', 'Supercalifrag\u2026']);
t.is('a short name wins, else the first three letters of the name', [a.planShort({ short: 'PU', name: 'Push' }), a.planShort({ name: 'Full body A' }), a.planShort({ short: '  ', name: 'Pull' })], ['PU', 'Ful', 'Pul']);
t.is('a short name is cut to three whatever was stored', [a.planShort({ short: 'ABCDEF', name: 'x' }), a.planShort({ short: 12345, name: 'x' }), a.planShort(null)], ['ABC', '123', '']);
t.is('nothing is a blank name', [a.planName(''), a.planName(null)], ['', '']);
t.is('the days of one routine, for its row', [a.planDaysOf('pull'), a.planDaysOf('legs'), a.planDaysOf('x')], ['Mon', 'Fri', '']);

t.is('the last run is the newest one', make({ routines: R }, () => [{ date: '2026-11-02T10:00:00' }, { date: '2026-11-09T10:00:00' }, { date: '2026-11-05T10:00:00' }]).lastRun(R[0]).date, '2026-11-09T10:00:00');
t.is('and none is null', a.lastRun(R[0]), null);

// calendar days, with Wednesday 18 Nov as today and Monday the week's start
t.is('today is marked, done or not', [a.planCell(day(18), WED, false), a.planCell(day(18), WED, true)], [' now', 'done now']);
t.is('a worked day is done, planned or not', [a.planCell(day(16), WED, true), a.planCell(day(17), WED, true)], ['done', 'done']);
t.is('a planned day earlier this week with no workout is missed', a.planCell(day(16), WED, false), 'miss');
t.is('a rest day earlier this week is nothing', a.planCell(day(17), WED, false), '');
t.is('a planned day still ahead is planned', [a.planCell(day(20), WED, false), a.planCell(day(23), WED, false)], ['plan', 'plan']);
t.is('a missed day from an earlier week is not counted', a.planCell(day(9), WED, false), '');
t.is('with no plan nothing is planned or missed', [make({ routines: R }).planCell(day(16), WED, false), make({ routines: R }).planCell(day(20), WED, false)], ['', '']);

// travelling between devices
const p1 = ['pull', '', '', '', '', '', ''], p2 = ['legs', '', '', '', '', '', ''];
t.is('the cloud copy of the plan wins a merge', merge.mergeStores({ plan: p1 }, { plan: p2 }).plan, p2);
t.is('a cloud row with no plan leaves this one', merge.mergeStores({ plan: p1 }, {}).plan, p1);
t.is('a plan that is not a plan is dropped', merge.mergeStores({ plan: 'x' }, { plan: ['a'] }).plan, undefined);
t.is('when two devices meet on the lock this one wins', [merge.unionStores({ plan: p1 }, { plan: p2 }).plan, merge.unionStores({}, { plan: p2 }).plan], [p1, p2]);
t.done();
