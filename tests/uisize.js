/* Interface size: the five steps, what a saved value means, and what lands on <html>. node tests/uisize.js */
const { slice, suite } = require('./lib');
const t = suite('uisize');

const root = { style: { fontSize: '', removeProperty(k) { if (k === 'font-size') this.fontSize = ''; } } };
const f = new Function('root', slice('  var UI_SIZES', '  function drawUi()') + '; return { sizes: UI_SIZES, size: uiSize, apply: applyUi };')(root);

t.is('two sizes: normal, and slightly smaller', f.sizes.map((z) => z[1]), ['Normal', 'Slightly smaller']);
t.is('normal is exactly one, the other is smaller', [f.sizes[0][2], f.sizes[1][2] < 1], [1, true]);
t.is('nothing saved is normal', [f.size(null)[1], f.size(undefined)[1], f.size('')[1]], ['Normal', 'Normal', 'Normal']);
t.is('what is not a size is normal too, including the larger sizes that were offered once', [f.size('9')[1], f.size('x')[1], f.size('2')[1], f.size('1')[1], f.size('-2')[1], f.size(5)[1]], ['Normal', 'Normal', 'Normal', 'Normal', 'Normal', 'Normal']);
t.is('a saved step is read back, as text or as a number', [f.size('-1')[1], f.size(-1)[1], f.size('0')[1], f.size(0)[1]], ['Slightly smaller', 'Slightly smaller', 'Normal', 'Normal']);

f.apply('-1');
t.is('slightly smaller: 14.88px on the root, 0.93 of 16', root.style.fontSize, '14.88px');
f.apply('0');
t.is('normal leaves no font size at all: the browser\'s own, as the app always looked', root.style.fontSize, '');
f.apply('-1');
f.apply(null);
t.is('and a value that is nothing brings it back', root.style.fontSize, '');
f.apply('-1');
f.apply('2');
t.is('a size that is no longer offered is normal', root.style.fontSize, '');
t.done();
