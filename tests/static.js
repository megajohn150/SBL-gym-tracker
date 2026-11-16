/* The whole file at once: the mistakes one scope and one stylesheet make easy. A second
   function under a taken name silently replaces the first, an id asked for and not in the
   markup throws at boot, and an asset missing from the worker's list never updates.
   node tests/static.js */
const fs = require('fs');
const path = require('path');
const { FILE, suite } = require('./lib');
const t = suite('static');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const page = fs.readFileSync(FILE, 'utf8');
const a = page.lastIndexOf('<script>'), b = page.lastIndexOf('</script>');
const js = page.slice(a + 8, b), html = page.slice(0, a);
const all = (re, s, g) => { const out = []; let m; while ((m = re.exec(s))) out.push(m[g || 1]); return out; };
const dups = (list) => list.filter((v, i) => list.indexOf(v) !== i).filter((v, i, l) => l.indexOf(v) === i);

const ids = all(/\sid="([^"]+)"/g, html);
t.is('no id is used twice in the markup', dups(ids), []);

// ids the script builds itself, and so finds only after drawing them
const drawn = all(/id="([a-z0-9-]+)"/g, js);
const asked = all(/(?:\$|getElementById)\('([^']+)'\)/g, js);
// d-dur is the one id put together from a prefix (whenFields)
t.is('every id the script asks for exists', asked.filter((k) => !ids.includes(k) && !drawn.includes(k) && k !== 'd-dur'), []);

// functions declared at the top of the IIFE (two spaces in); nested helpers may repeat
const fns = all(/^  function\s+([A-Za-z0-9_$]+)\s*\(/gm, js);
t.is('no top-level function name is taken twice', dups(fns), []);
const vars = all(/^  var ([A-Za-z0-9_$]+)/gm, js);
t.is('no top-level var is declared twice', dups(vars), []);
t.is('no var shares a name with a function', vars.filter((v) => fns.includes(v)), []);

const screens = all(/(?:push|popTo|goTab)\('([a-z-]+)'\)/g, js)
  .concat(all(/data-(?:push|tabgo|tab)="([a-z-]+)"/g, html));
t.is('every screen that is opened exists', dups(screens.concat(screens)).filter((k) => !ids.includes('s-' + k)), []);

// the page's script is ES5 on purpose
const code = js.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, ''));
t.is('no arrow functions, const, let or template literals in the page',
  code.filter((l) => /=>|^\s*(const|let)\s|`/.test(l)).length, 0);

const sw = read('public/sw.js');
const core = all(/'\.\/([^']+)'/g, sw);
t.is('every file in the worker\'s CORE list exists', core.filter((f) => !fs.existsSync(path.join(root, 'public', f))), []);
const used = dups(all(/((?:imgs|fonts|logo)\/[A-Za-z0-9_.\/-]+)/g, page).concat(all(/((?:imgs|fonts|logo)\/[A-Za-z0-9_.\/-]+)/g, page)));
t.is('every asset the page names is in CORE', used.filter((f) => !sw.includes(f)), []);
const fonts = all(/([A-Za-z0-9-]+\.woff2)/g, read('public/fonts/fonts.css'));
t.is('every font file is in CORE', dups(fonts.concat(fonts)).filter((f) => !sw.includes(f)), []);
const cdn = /supabase-js@[0-9.]+/;
t.is('the page and the worker pin the same supabase-js', cdn.exec(page)[0] === cdn.exec(sw)[0], true);

t.is('APP_VERSION has the shape the commit hook bumps', /var APP_VERSION = '\d+\.\d{4}';/.test(js), true);

const listed = /const files = \[([^\]]+)\]/.exec(read('tests/run.js'))[1];
const suites = fs.readdirSync(__dirname).filter((f) => /\.js$/.test(f) && !/^(lib|run|fake-)/.test(f));
t.is('every test file is in the list run.js runs', suites.filter((f) => !listed.includes("'" + f + "'")), []);

/* the server, as the repo describes it */
const sql = read('supabase/supabase-social.sql');
const tables = all(/create table if not exists public\.(\w+)/g, sql);
t.is('every table has row level security switched on',
  tables.filter((n) => !sql.includes('alter table public.' + n + ' enable row level security')), []);
const defs = sql.split(/create or replace function /).slice(1).map((s) => s.slice(0, s.indexOf('$$')));
t.is('every security definer function pins its search_path',
  defs.filter((d) => /security definer/.test(d) && !/set search_path/.test(d)).map((d) => d.slice(0, 30)), []);
t.is('the push secret in the repo is still the placeholder', /'x-push-secret', '<PUSH_SECRET>'/.test(sql), true);

// one list of push kinds in three places: the settings switches, the function, the jobs table
const fn = read('supabase/functions/notify/index.ts');
const keys = (name) => all(/^\s{2}(\w+):/gm, fn.slice(fn.indexOf('const ' + name), fn.indexOf('};', fn.indexOf('const ' + name))));
const switches = all(/^\s{4}\['(\w+)', '/gm, js.slice(js.indexOf('var PUSH_KINDS'), js.indexOf('function drawPushKinds')));
t.is('the settings switches are the kinds the function can send', switches.slice().sort(), keys('LINE').concat(keys('SELF')).sort());
t.is('the kinds the app parks are the ones the table allows',
  all(/'(\w+)'/g, /check \(kind in \(([^)]+)\)/.exec(sql)[1]).sort(), dups(all(/(?:pushJob|killJob)\('(\w+)'/g, js).concat(all(/(?:pushJob|killJob)\('(\w+)'/g, js))).sort());
// the change log: newest first, and never behind the version (a commit's line is written before the hook bumps it)
const logv = all(/^    \['(\d+\.\d+)', '/gm, js.slice(js.indexOf('var CHANGELOG'), js.indexOf('];', js.indexOf('var CHANGELOG')))).map(Number);
t.is('the change log runs newest first', logv.slice().sort((x, y) => y - x), logv);
t.is('and its newest line is not behind APP_VERSION', logv[0] >= Number(/var APP_VERSION = '([\d.]+)'/.exec(js)[1]), true);
t.done();
