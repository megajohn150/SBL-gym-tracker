# Przejście na Supabase

Cel: logujesz się na stronie, dane trzymają się w chmurze, każde urządzenie widzi to samo,
a przerwany trening da się wznowić po zamknięciu karty — też na innym telefonie.

---

## 1. Model danych — dlaczego jeden wiersz, a nie dziesięć tabel

Apka trzyma wszystko w jednym obiekcie `store` (`exercises`, `routines`, `workouts`, `profile`)
plus osobno `session` (trwający trening). Rozbijanie tego na tabele relacyjne znaczyłoby
przepisanie każdej funkcji rysującej. Zamiast tego: **jeden wiersz na użytkownika**, w nim dwa
pola `jsonb`.

```
tracker
  user_id    uuid    ← klucz główny, = auth.uid()
  data       jsonb   ← cały store
  session    jsonb   ← trwający trening albo null
  rev        bigint  ← licznik wersji, chroni przed nadpisaniem
  updated_at timestamptz
```

Twoje 85 treningów to 295 KB. Nawet po kilku latach będzie to ~1-2 MB — mieści się
spokojnie w limicie darmowego planu (500 MB) i w jednym zapytaniu.

Jeśli kiedyś zrobi się z tego aplikacja dla wielu osób z feedem i statystykami po stronie
serwera — wtedy warto przejść na tabele. Na teraz to byłby koszt bez zysku.

---

## 2. Projekt w Supabase

1. [supabase.com](https://supabase.com) → **New project**
2. region: **Frankfurt (eu-central-1)** — najbliżej
3. zapisz hasło do bazy (przyda się tylko do SQL przez psql, nie do apki)
4. **Settings → API** → skopiuj:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key** (długi JWT)

**Ten klucz jest publiczny i tak ma być.** Ląduje w kodzie strony, każdy go zobaczy.
Bezpieczeństwo robi RLS z punktu 3 — bez zalogowania ten klucz nie daje dostępu do niczego.
Klucza `service_role` **nigdy** nie wklejaj do strony.

---

## 3. Tabela i RLS

**SQL Editor → New query**, wklej całość, Run:

```sql
create table public.tracker (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  session    jsonb,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tracker enable row level security;

create policy "read own"   on public.tracker for select using (auth.uid() = user_id);
create policy "insert own" on public.tracker for insert with check (auth.uid() = user_id);
create policy "update own" on public.tracker for update using (auth.uid() = user_id)
                                                  with check (auth.uid() = user_id);

-- każdy nowy użytkownik dostaje swój pusty wiersz
create function public.new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.tracker (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.new_user();
```

Po tym sprawdź w **Database → Tables → tracker**, że przy nazwie świeci się „RLS enabled".
Bez RLS każdy z kluczem anon czytałby cudze dane.

---

## 4. Logowanie

**Authentication → Providers → Email**: zostaw włączone, wyłącz resztę.

**Authentication → Settings**:
- „Confirm email" — dla jednego użytkownika możesz wyłączyć, wtedy rejestracja jest
  natychmiastowa. Jeśli zostawisz, po rejestracji klikasz link z maila.
- Darmowy SMTP Supabase ma limit kilku maili na godzinę. Dla ciebie bez znaczenia,
  przy większej liczbie osób trzeba podpiąć własny (Resend, Postmark).

Konto zakładasz raz, z poziomu apki (formularz z punktu 5).

---

## 5. Zmiany w `public/index.html`

### 5a. Biblioteka i konfiguracja

W `<head>`, przed własnym `<script>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
```

Na górze swojego skryptu:

```js
var SB_URL = 'https://xxxx.supabase.co';
var SB_KEY = 'eyJ...';                       // anon public
var sb = window.supabase.createClient(SB_URL, SB_KEY);
var me = null;                               // zalogowany user albo null
```

### 5b. Ekran logowania

Nowy `<section class="screen" id="s-login">` z dwoma polami i dwoma przyciskami
(Sign in / Create account). Pokazuje się zamiast apki, dopóki `me === null`.

```js
async function signIn(email, pass) {
  var r = await sb.auth.signInWithPassword({ email: email, password: pass });
  if (r.error) { showAuthError(r.error.message); return; }
}
async function signUp(email, pass) {
  var r = await sb.auth.signUp({ email: email, password: pass });
  if (r.error) { showAuthError(r.error.message); return; }
}

sb.auth.onAuthStateChange(function (_e, session) {
  me = session ? session.user : null;
  if (me) start(); else showLogin();
});
```

Sesja logowania siedzi w localStorage i odnawia się sama — logujesz się raz na urządzenie,
nie przy każdym wejściu.

### 5c. Warstwa synchronizacji

To jest sedno. **localStorage zostaje** jako kopia lokalna — dzięki niej apka działa bez
zasięgu i startuje natychmiast, nie czekając na sieć. Chmura jest źródłem prawdy przy starcie.

```js
var cloud = { rev: 0, timer: null, dirty: false, online: true };

// START: najpierw lokalnie (szybko), potem z chmury (prawda)
async function start() {
  loadStore();                       // jak dotąd, z localStorage
  bootApp();                         // apka rusza od razu
  await pull();                      // dociąga chmurę i przerysowuje
}

async function pull() {
  var r = await sb.from('tracker').select('data,session,rev').eq('user_id', me.id).maybeSingle();
  if (r.error) { cloud.online = false; return; }
  cloud.online = true;

  var remote = r.data;
  if (!remote) return;

  // pierwsze logowanie na nowym koncie: wypychamy to, co jest lokalnie
  if (remote.rev === 0 && store.workouts.length) { cloud.rev = 0; return push(true); }

  cloud.rev = remote.rev;
  store = mergeStores(store, remote.data);
  saveStore();                       // odśwież kopię lokalną

  if (remote.session) { session = remote.session; saveSession(); }
  redrawEverything();
}
```

**Scalanie.** Gdyby dwa urządzenia zapisały niezależnie, zwykłe „wygrywa ostatni" skasowałoby
trening z tego drugiego. Treningi mają `id`, więc łączymy je po id — nic się nie gubi:

```js
function mergeStores(local, remote) {
  var byId = {};
  (remote.workouts || []).concat(local.workouts || []).forEach(function (w) { byId[w.id] = w; });
  var workouts = Object.keys(byId).map(function (k) { return byId[k]; })
    .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
  return {
    profile:   remote.profile   || local.profile,
    exercises: remote.exercises || local.exercises,   // te zmieniają się rzadko
    routines:  remote.routines  || local.routines,
    workouts:  workouts
  };
}
```

**Zapis.** `rev` działa jak zamek: zapisujemy tylko wtedy, gdy w bazie nadal stoi ta wersja,
którą widzieliśmy. Jak nie — dociągamy, scalamy i piszemy jeszcze raz. Żaden zapis nie
przepadnie po cichu.

```js
async function push(force) {
  if (!me) return;
  var next = cloud.rev + 1;
  var row = { data: store, session: session, rev: next, updated_at: new Date().toISOString() };

  var q = sb.from('tracker').update(row).eq('user_id', me.id);
  if (!force) q = q.eq('rev', cloud.rev);            // optimistic lock
  var r = await q.select('rev').maybeSingle();

  if (r.error) { cloud.online = false; cloud.dirty = true; return; }
  if (!r.data) { await pull(); return push(); }      // ktoś nas wyprzedził
  cloud.rev = next;
  cloud.dirty = false;
  cloud.online = true;
}
```

**Podpięcie pod istniejący kod.** Wszystkie zapisy przechodzą przez dwie funkcje — zmieniasz
tylko je, a te 22 wywołania w kodzie zostają nietknięte:

```js
function saveStore() {
  save('data', JSON.stringify(store));
  queuePush();
}
function saveSession() {
  try {
    if (session) localStorage.setItem('tracker-session', JSON.stringify(session));
    else localStorage.removeItem('tracker-session');
  } catch (e) {}
  queuePush();
}

// jeden zapis do chmury po serii zmian, zamiast przy każdym wciśniętym klawiszu
function queuePush() {
  cloud.dirty = true;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(push, 1500);
}

// wychodzisz z karty w trakcie serii — lecimy natychmiast
addEventListener('visibilitychange', function () {
  if (document.hidden && cloud.dirty) push();
});
addEventListener('pagehide', function () { if (cloud.dirty) push(); });
addEventListener('online', function () { if (cloud.dirty) push(); });
```

`sendBeacon` tu nie zadziała (potrzebny nagłówek z tokenem), ale `visibilitychange` na iOS
odpala się przy przełączeniu apki i wystarcza — a nawet jak nie zdąży, lokalna kopia
i tak jest, więc dosynchronizuje się przy następnym otwarciu.

### 5d. Przerwany trening

Dzięki temu, że `session` jedzie w tym samym wierszu, działa to samo:
zamykasz kartę w trakcie serii → otwierasz na innym telefonie → `pull()` wstawia `session`
i dock „Workout in progress" jest na swoim miejscu. Zegar liczy od `startedAt`, więc czas
się zgadza niezależnie od urządzenia.

### 5e. Wylogowanie

W Settings, obok Export/Import:

```js
await sb.auth.signOut();
localStorage.removeItem('tracker-data');      // nie zostawiaj danych na cudzym sprzęcie
localStorage.removeItem('tracker-session');
location.reload();
```

---

## 6. Przeniesienie tego, co masz

Po pierwszym zalogowaniu apka widzi pusty wiersz (`rev = 0`) i sama wypycha to, co jest
w localStorage. Jeśli na tym urządzeniu nic nie ma, użyj **Settings → Import backup**
z plikiem `hevy-import.json` — import zapisuje przez `saveStore()`, więc od razu idzie do chmury.

Kolejność, żeby nic nie zgubić:

1. na telefonie, gdzie masz dane: **Export backup** (kopia na wszelki wypadek)
2. zaloguj się
3. sprawdź w Supabase **Table editor → tracker**, że `data` nie jest puste
4. dopiero wtedy loguj się na drugim urządzeniu

---

## 7. Test po wdrożeniu

- [ ] rejestracja i logowanie na telefonie
- [ ] trening → zamknij kartę w środku → otwórz → seria i czas na miejscu
- [ ] ten sam trening otwarty na laptopie → widać go
- [ ] tryb samolotowy → logujesz serię → wraca sieć → pojawia się w bazie
- [ ] drugie urządzenie dopisuje trening → na pierwszym po odświeżeniu są oba
- [ ] wylogowanie czyści localStorage

---

## 8. O czym pamiętać

- **Darmowy plan usypia projekt po 7 dniach bez żadnego zapytania.** Wchodzisz na siłownię
  co kilka dni, więc problemu nie będzie, ale po dłuższej przerwie pierwsze wejście potrwa
  kilkanaście sekund (albo trzeba kliknąć „Restore" w panelu).
- **Backup**: Supabase na darmowym planie nie robi codziennych kopii. Zostaw Export backup
  w Settings i raz na jakiś czas zrzuć plik — to twoja polisa.
- **Offline**: apka nadal nie ma service workera, więc bez zasięgu **nie wstanie od zera**.
  localStorage ratuje tylko już otwartą kartę. To osobny temat, wart zrobienia razem z tym.
- **Nie zmieniaj struktury `store` bez potrzeby** — teraz jest tylko w `jsonb`, więc żadna
  migracja nie jest wymuszona, ale stare wiersze zostają w starym kształcie.
