/* Likes and comments made with no signal: kept in order, retried, and one that can never
   succeed must not block the rest for ever. node tests/queue.js */
const { slice, suite } = require('./lib');
const code = slice('  var rq = [];', '  function cmtRow(r)');
const t = suite('queue');

const sent = [], mem = {};
const sb = { from: () => ({ upsert: (row) => Promise.resolve(row.bad ? { error: { message: 'no' } } : (sent.push(row.id), { error: null })) }) };
const api = new Function('sb', 'me', 'load', 'save', 'window', code +
  '; return { add: rqAdd, flush: rqFlush, len: function () { return rq.length; }, load: rqLoad };')(
  sb, { id: 'me' }, (k) => mem[k] || null, (k, v) => { mem[k] = v; }, {});

(async () => {
  api.add({ t: 'cmt', row: { id: 'bad', bad: true } });
  api.add({ t: 'cmt', row: { id: 'good' } });
  for (let i = 0; i < 5; i++) await api.flush();
  t.is('a failing job waits at the front, the rest behind it', [api.len(), sent], [2, []]);
  await api.flush();
  t.is('after six tries it is dropped and the rest goes through', [api.len(), sent], [0, ['good']]);
  t.is('the queue on the device is empty too', JSON.parse(mem['react-q']), []);

  mem['react-q'] = '{not json';
  api.load();
  t.is('a broken queue on the device reads as empty', api.len(), 0);
  t.done();
})();
