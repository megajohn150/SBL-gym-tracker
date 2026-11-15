/* When the "add to home screen" banner shows: iPhone/iPad Safari in a tab, nowhere else.
   node tests/a2hs.js */
const { slice, suite } = require('./lib');
const t = suite('a2hs');
const f = new Function(slice('  function needsA2hs(', '  function drawA2hs()') + '; return needsA2hs;')();

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
t.is('an iPhone tab shows it', f(SAFARI, 'iPhone', 5, false, null), true);
t.is('the installed app does not', f(SAFARI, 'iPhone', 5, true, null), false);
t.is('a dismissed banner stays away', f(SAFARI, 'iPhone', 5, false, '1'), false);
t.is('Chrome on iPhone is left alone', f(SAFARI + ' CriOS/120', 'iPhone', 5, false, null), false);
t.is('an iPad that calls itself a Mac still counts', f('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 'MacIntel', 5, false, null), true);
t.is('a real Mac and an Android phone do not', [f('Mozilla/5.0 (Macintosh) Safari/605', 'MacIntel', 0, false, null), f('Mozilla/5.0 (Linux; Android 14) Chrome/120', 'Linux armv8l', 5, false, null)], [false, false]);
t.done();
