/* Wspólne dla testów: wycinanie kodu z aplikacji i liczenie asercji.

   Aplikacja to jeden plik i jedno IIFE, więc testy nie mają czego
   zaimportować. Zamiast tego wycinają z index.html blok funkcji po jego
   pierwszej i ostatniej linii i robią eval w zakresie, w którym stoją
   podstawione globalne. Testowany jest więc ten sam tekst, który jedzie na
   produkcję — nie jego kopia, która po cichu się rozjedzie. */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'public', 'index.html');

function slice(from, to) {
  const src = fs.readFileSync(FILE, 'utf8');
  const a = src.indexOf(from);
  const b = src.indexOf(to);
  if (a < 0) throw new Error('nie ma tego w index.html: ' + from);
  if (b < a) throw new Error('nie ma tego w index.html: ' + to);
  return src.slice(a, b);
}

// cleanPlan, as shipped: mergeStores, unionStores and mergeImport call it, and the blocks the tests
// slice out of the page do not hold it
function planClean() { return slice('  function cleanPlan(', '  // the routine planned for a weekday'); }

function suite(name) {
  const ok = [];
  const bad = [];
  return {
    is(what, got, want) {
      const g = JSON.stringify(got);
      const w = JSON.stringify(want);
      (g === w ? ok : bad).push(what + ' → ' + g + (g === w ? '' : '   MIAŁO BYĆ ' + w));
    },
    done() {
      ok.forEach((l) => console.log('  ok  ' + l));
      bad.forEach((l) => console.log('FAIL  ' + l));
      console.log(bad.length
        ? '\n' + name + ': ' + bad.length + ' z ' + (ok.length + bad.length) + ' nie przeszło\n'
        : '\n' + name + ': wszystkie ' + ok.length + ' przeszły\n');
      process.exit(bad.length ? 1 : 0);
    }
  };
}

module.exports = { FILE, slice, suite, planClean };
