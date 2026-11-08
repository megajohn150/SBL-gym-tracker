/* Wszystkie testy naraz:  node tests/run.js
   Zero zależności, zero instalowania — tylko node i public/index.html. */
const { execFileSync } = require('child_process');
const path = require('path');

const files = ['follow.js', 'routines.js', 'pull.js', 'compare.js'];
let bad = 0;

files.forEach((f) => {
  try {
    execFileSync(process.execPath, [path.join(__dirname, f)], { stdio: 'inherit' });
  } catch (e) {
    bad++;
  }
});

console.log(bad ? bad + ' z ' + files.length + ' plików nie przeszło' : 'Wszystko gra.');
process.exit(bad ? 1 : 0);
