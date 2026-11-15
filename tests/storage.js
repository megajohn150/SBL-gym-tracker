/* A full phone: a refused write of the log says so, once a minute, and other keys stay quiet.
   node tests/storage.js */
const { slice, suite } = require('./lib');
const t = suite('storage');

const code = slice('  var fullAt = 0;', '  function load(k)');
let toasts = 0, now = 1e9, full = true;
const api = new Function('toast', 'localStorage', 'Date', code + '; return { save: save };')(
  () => { toasts++; }, { setItem() { if (full) throw new Error('QuotaExceededError'); } }, { now: () => now });

api.save('data', '{}');
t.is('a refused write of the log is announced', toasts, 1);
api.save('data', '{}'); now += 30000; api.save('data', '{}');
t.is('and not again within the minute', toasts, 1);
now += 31000; api.save('data', '{}');
t.is('but again after it', toasts, 2);
now += 61000; api.save('feed-x', 'big');
t.is('a cache that did not fit is not worth a toast', toasts, 2);
full = false; now += 61000; api.save('data', '{}');
t.is('a write that works is silent', toasts, 2);
t.done();
