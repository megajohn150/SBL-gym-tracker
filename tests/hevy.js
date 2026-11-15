/* Hevy's export, read straight into the log: quoted fields, months in the phone's own
   language, warm-ups left out. node tests/hevy.js */
const { slice, suite } = require('./lib');
const t = suite('hevy');
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };
const api = new Function('num', slice('  var HEVY_MUSCLE = [', '  function hevyImport(text)') +
  '; return { parse: hevyParse, date: hevyDate, muscle: hevyMuscle, rows: csvRows };')(num);

t.is('a quoted field keeps its commas, quotes and line breaks',
  api.rows('a,"b, ""c""","line1\nline2"\r\nd,e,f'), [['a', 'b, "c"', 'line1\nline2'], ['d', 'e', 'f']]);
const p = api.date('27 paź 2026, 09:30');
t.is('a Polish month is read', [p.getFullYear(), p.getMonth(), p.getDate(), p.getHours(), p.getMinutes()], [2026, 9, 27, 9, 30]);
t.is('so is an English one, and a date with no time', [api.date('3 Feb 2026, 18:05').getMonth(), api.date('3 Feb 2026').getHours()], [1, 0]);
t.is('something that is no date is nothing', api.date('soon'), null);
t.is('the first pattern that fits wins: legs before arms',
  [api.muscle('Uginanie nóg leżąc'), api.muscle('Uginanie ramion'), api.muscle('Bench Press (Barbell)'), api.muscle('Zzz')],
  ['Hamstrings', 'Biceps', 'Chest', '']);
// the exercise form's suggestion reads the same list, so a typed name should land right
t.is('typed names get a sensible muscle',
  ['Squat', 'Leg Press', 'Lat Pulldown', 'Face Pull', 'Barbell Row', 'Tricep Pushdown', 'Hammer Curl', 'Lateral Raise',
   'Overhead Press', 'Crunch', 'Calf Raise', 'Hip Thrust', 'Wyciskanie hantli', 'Podciąganie', 'Martwy ciąg'].map(api.muscle),
  ['Quads', 'Quads', 'Lats', 'Upper back', 'Upper back', 'Triceps', 'Biceps', 'Shoulders',
   'Shoulders', 'Abs', 'Calves', 'Glutes', 'Chest', 'Lats', 'Upper back']);

const head = 'title,start_time,end_time,description,exercise_title,superset_id,exercise_notes,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe';
const csv = [head,
  '"Push, day ""A""","27 paź 2026, 09:30","27 paź 2026, 10:30","felt good","Bench Press",,"",0,"warmup",40,10,,,',
  '"Push, day ""A""","27 paź 2026, 09:30","27 paź 2026, 10:30","felt good","Bench Press",,"elbows in",1,"normal",80,8,,,8',
  '"Push, day ""A""","27 paź 2026, 09:30","27 paź 2026, 10:30","felt good","Bench Press",,"elbows in",2,"failure",80,6,,,',
  '"Push, day ""A""","27 paź 2026, 09:30","27 paź 2026, 10:30","felt good","Treadmill",,"",0,"normal",,,5,1800,',
  '"Pull","28 Oct 2026, 18:00","28 Oct 2026, 19:15","","Chin Up",,"",0,"normal",,12,,,'].join('\n');
const out = api.parse(csv);
t.is('rows of one session are one workout', out.workouts.map((w) => [w.name, w.seconds, w.note]),
  [['Push, day "A"', 3600, 'felt good'], ['Pull', 4500, '']]);
t.is('warm-ups are left out and counted; cardio has no reps and is dropped',
  [out.warmups, out.workouts[0].ex.map((e) => e.name)], [1, ['Bench Press']]);
t.is('RPE becomes reps in reserve, a failure set is F', out.workouts[0].ex[0].sets,
  [{ weight: '80', reps: '8', rir: '2' }, { weight: '80', reps: '6', rir: 'F' }]);
t.is('the note comes with the exercise', out.workouts[0].ex[0].note, 'elbows in');
t.is('a bodyweight set has no weight, not a zero', out.workouts[1].ex[0].sets, [{ weight: '', reps: '12', rir: '' }]);
t.is('a file that is not a Hevy export is nothing', [api.parse('a,b\n1,2'), api.parse('')], [null, null]);
t.done();
