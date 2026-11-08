/* Zero dependencies:  node tests/fake-page.js
   Writes public/__t.html — index.html with supabase-js swapped for tests/fake-supabase.js.
   Serve it with the dev server and open /__t.html. The file is git-ignored; delete it after. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fake = fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
const tag = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase[^"]*"><\/script>/;

if (!tag.test(html)) throw new Error('nie ma tagu supabase-js w index.html');
fs.writeFileSync(path.join(root, '__t.html'), html.replace(tag, () => '<script>' + fake + '</script>'));
console.log('public/__t.html gotowy: otwórz /__t.html na serwerze deweloperskim');
