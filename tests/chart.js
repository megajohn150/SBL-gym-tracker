/* One scale for the chart on the page and the chart in the shared picture: the pure scale,
   and the page's own marks agreeing with it. node tests/chart.js */
const { slice, suite } = require('./lib');
const t = suite('chart');

const code = slice('  function chartScale(', '  function shareBtn(');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLab = (d) => d.getDate() + ' ' + MONTHS[d.getMonth()];
const api = new Function('MONTHS', 'dayLab', 'CUP_SM', 'esc',
  code + '; return { scale: chartScale, h: chartH, tick: xTick, body: chartBody, ends: chartEnds, yEnds: yEnds };')(MONTHS, dayLab, '', (v) => String(v));

const B = (vs) => vs.map((v, i) => ({ from: new Date(2026, 0, 1 + i).getTime(), v }));
const day = { unit: 'day' }, month = { unit: 'month' };

t.is('bars are read against zero', api.scale(B([0, 40, 100]), 'bars'), { xmax: 100, base: 0, top: 100, step: 1 });
t.is('a line starts below the lightest session', api.scale(B([50, 100]), 'line').base, 50 - 50 * 0.35);
t.is('one session alone sits mid-box', [api.scale(B([0, 80]), 'line').top, api.scale(B([0, 80]), 'line').base], [160, 0]);
t.is('nothing logged does not divide by zero', api.h(api.scale(B([0, 0]), 'line'), 0), 0);

const bs = B([30, 0, 90, 60, 45, 70, 20, 100]);
const html = api.body(bs, 'line', day, () => '');
const sc = api.scale(bs, 'line');
const marks = (html.match(/bottom:[0-9.]+%/g) || []).map((m) => m.slice(7, -1));
t.is('the dots on the page sit where the shared picture puts them', marks,
  bs.filter((b) => b.v).map((b) => api.h(sc, b.v).toFixed(2)));

t.is('the label step counts back from the newest bucket',
  bs.map((b, i) => api.tick(b, i, bs.length, 2, day)), ['', '2 Jan', '', '4 Jan', '', '6 Jan', '', '8 Jan']);
t.is('a month chart is labelled by month', api.tick(bs[0], 0, 1, 1, month), 'Jan');

t.is('the ends are the first and the last logged value, zeros around them ignored',
  [api.ends(B([0, 62.5, 0, 70, 77, 0])), api.ends(B([0, 0]))], [[62.5, 77, false], null]);
t.is('one logged bucket is one number, not the same one twice', api.ends(B([0, 50, 0]))[2], true);
t.is('the row writes both numbers, or only the last', [api.yEnds(B([60, 0, 77]), (v) => v + ' kg'), api.yEnds(B([0, 50]), (v) => v + ' kg'), api.yEnds(B([0, 0]), (v) => v)],
  ['<span>60 kg</span><span>77 kg</span>', '<span></span><span>50 kg</span>', '']);
t.done();
