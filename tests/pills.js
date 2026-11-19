/* The lifetime pills under the bio: the formatters and the fun comparison. node tests/pills.js */
const { slice, suite } = require('./lib');
const t = suite('pills');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const f = new Function('esc', slice('  var FUN = [', '  function lifeTotals()') + '; return { funTons: funTons, fmtTons: fmtTons, fmtHours: fmtHours, pillsHtml: pillsHtml };')(esc);

t.is('a feather weight gets a nudge', f.funTons(0.1), 'Not yet as heavy as a grand piano');
t.is('40 t is a few buses, not one Boeing', f.funTons(40), 'About 3.3 double-decker buses');
t.is('exactly one of something is singular', f.funTons(0.45), 'About 1 grand piano');
t.is('between one and two it still names the thing', f.funTons(0.6), 'About 1.3 grand pianos');
t.is('a big total is a landmark', f.funTons(21000), 'About 2.1 Eiffel Towers');
t.is('tons: one decimal under ten, whole above, grouped', [f.fmtTons(8400), f.fmtTons(42100), f.fmtTons(1234000)], ['8.4t', '42t', '1,234t']);
t.is('hours the same', [f.fmtHours(5400), f.fmtHours(420 * 3600)], ['1.5h', '420h']);
t.is('a pill left out is not drawn, the others are', f.pillsHtml(null, null, 3600).includes('sets'), false);
t.is('and the tons pill carries its comparison', f.pillsHtml(5, 40000, 3600).includes('data-tip="About 3.3 double-decker buses"'), true);
t.is('nothing shown, nothing drawn', f.pillsHtml(null, null, null), '');
t.done();
