/* A file leaves through the share sheet, or downloads where there is none; the backup clock
   moves only once it has really gone. node tests/send.js */
const { slice, suite } = require('./lib');
const t = suite('send');

const code = slice('  function sendFile(file, done)', '  function exportSaved()');
function make(nav) {
  const log = [];
  const doc = { createElement: () => ({ click() { log.push('download'); } }), body: { appendChild() {}, removeChild() {} } };
  const URLx = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
  const fn = new Function('navigator', 'document', 'URL', 'File', 'setTimeout', code + '; return sendFile;')(
    nav, doc, URLx, function File(parts, name) { this.name = name; }, () => {});
  return { fn, log };
}
const file = { name: 'a.json' };

(async () => {
  let a = make({ canShare: () => true, share: () => Promise.resolve() }), n = 0;
  a.fn(file, () => n++); await Promise.resolve().then(() => {});
  t.is('shared: done runs after the sheet resolves, nothing is downloaded', [n, a.log], [1, []]);

  a = make({ canShare: () => true, share: () => Promise.reject(new Error('AbortError')) }); n = 0;
  a.fn(file, () => n++); await Promise.resolve().then(() => {});
  t.is('a dismissed sheet is not an export', [n, a.log], [0, []]);

  a = make({}); n = 0;
  a.fn(file, () => n++);
  t.is('no share sheet: it downloads and is done', [n, a.log], [1, ['download']]);

  a = make({ canShare: () => false, share: () => { throw new Error('no'); } }); n = 0;
  a.fn(file); 
  t.is('a file the sheet refuses downloads, with no done to call', a.log, ['download']);
  t.done();
})();
