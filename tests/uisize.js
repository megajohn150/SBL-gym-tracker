/* Interface size: the five steps, what a saved value means, and what lands on <html>. node tests/uisize.js */
const { slice, suite } = require('./lib');
const t = suite('uisize');

const root = { style: { fontSize: '', removeProperty(k) { if (k === 'font-size') this.fontSize = ''; } } };
const f = new Function('root', slice('  var UI_SIZES', '  function drawUi()') + '; return { sizes: UI_SIZES, size: uiSize, apply: applyUi };')(root);

t.is('five sizes, from much smaller to much larger', f.sizes.map((z) => z[1]), ['Much smaller', 'Slightly smaller', 'Normal', 'Slightly larger', 'Much larger']);
t.is('they grow, and normal is exactly one', [f.sizes.map((z) => z[2]).every((v, i, a) => !i || v > a[i - 1]), f.sizes[2][2]], [true, 1]);
t.is('nothing saved is normal', [f.size(null)[1], f.size(undefined)[1], f.size('')[1]], ['Normal', 'Normal', 'Normal']);
t.is('what is not a size is normal too', [f.size('9')[1], f.size('x')[1], f.size('0.5')[1], f.size(5)[1]], ['Normal', 'Normal', 'Normal', 'Normal']);
t.is('a saved step is read back, as text or as a number', [f.size('-2')[1], f.size(2)[1], f.size('1')[1], f.size(-1)[1]], ['Much smaller', 'Much larger', 'Slightly larger', 'Slightly smaller']);

f.apply('2');
t.is('much larger: 18.4px on the root, 1.15 of 16', root.style.fontSize, '18.4px');
f.apply('-2');
t.is('much smaller: 13.6px', root.style.fontSize, '13.6px');
f.apply('1');
t.is('slightly larger', root.style.fontSize, '17.12px');
f.apply('-1');
t.is('slightly smaller', root.style.fontSize, '14.88px');
f.apply('0');
t.is('normal leaves no font size at all: the browser\'s own, as the app always looked', root.style.fontSize, '');
f.apply('2');
f.apply(null);
t.is('and a value that is nothing brings it back', root.style.fontSize, '');
t.done();
