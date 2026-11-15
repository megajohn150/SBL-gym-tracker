# Pomysły: instrukcje dodania

Numeracja z listy 150 pomysłów. Rozmiary: **S** do godziny, **M** wieczór, **L** kilka podejść.

## 66. Historia wersji po stronie serwera (M do L)

**Problem:** w chmurze jest **jeden** wiersz `tracker` na osobę i każdy zapis go nadpisuje. Snapshoty
(`snapTake`, siedem dziennych kopii w IndexedDB) żyją tylko na telefonie i giną razem z ikoną. Błąd w kodzie,
który wypchnie złe dane, zabiera jedyną dobrą kopię.

**Projekt:**

- Tabela `public.tracker_history (user_id uuid, rev bigint, saved_at timestamptz default now(), workouts int, data jsonb, primary key (user_id, rev))` z RLS tylko `select` dla właściciela (zapis tylko przez trigger).
- Trigger `after update on public.tracker` (osobny od `live_on_tracker`): jeśli `new.data is distinct from old.data`
  i ostatnia kopia użytkownika jest starsza niż ~1 h, wstaw `old.data` (stan sprzed zapisu); potem usuń wszystko poza
  najnowszymi N (np. 30) wierszami użytkownika. `security definer`, `set search_path = public`.
- `delete_my_account` działa bez zmian (kaskada po FK `on delete cascade`).
- Klient: w arkuszu "Previous versions" druga sekcja "In the cloud"; przywrócenie jak dziś (`snapTake(true)`
  najpierw, podmiana `store`, `cloudPush(true)`). Przywrócony `store` nie ma `wiped`, co jest dobre.

**Rozmiar (zmierzony 15 listopada 2026):** największy wiersz `tracker` to 263 KB jako tekst JSON, 65 KB po
kompresji w bazie; średnio 28 KB; wierszy 5. Trzydzieści kopii największego to ok. 2 MB, dla wszystkich
pięciu osób ok. 4 MB, czyli niecały 1% limitu 500 MB (cała baza ma dziś 30,5 MB). Miejsce nie jest problemem.

**Weryfikacja:** `list_tables`, `get_advisors` po migracji; test ręczny: edytuj trening, sprawdź wiersz w
historii; przywróć. Zmiana addytywna, ale to baza z prawdziwym logiem: najpierw `supabase/supabase-social.sql`,
potem ta sama zmiana przez `apply_migration`.

---

## 70. Nagłówki bezpieczeństwa i CSP (S do M)

**Stan dziś:** brak pliku `public/_headers`, brak CSP. Cloudflare Pages czyta `public/_headers`.

**Fakty o aplikacji:** cały skrypt i style są inline (`<script>…</script>`, `<style>`, wiele `style=""`).
Zewnętrzne zasoby: supabase-js z `https://cdn.jsdelivr.net`, API i websocket
`https://nzagghskfwdosmopiuuk.supabase.co` / `wss://…`. Fonty i obrazy własne.

**Propozycja (zacznij od `Content-Security-Policy-Report-Only`):**

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://nzagghskfwdosmopiuuk.supabase.co wss://nzagghskfwdosmopiuuk.supabase.co; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: same-origin
  X-Content-Type-Options: nosniff
/sw.js
  Cache-Control: no-cache
```

**Skuteczność:** z `'unsafe-inline'` wstrzyknięty skrypt nadal się wykona. CSP blokuje tylko wysłanie danych na
obcy serwer (`connect-src`, `img-src`, `form-action`). **Nie blokuje** nawigacji (`location.href`) ani zapisu
przez Supabase do konta napastnika-znajomego (token pozwala pisać do własnych tabel, które znajomy czyta, np.
`bio`). Pełna ochrona = skrypt bez `unsafe-inline`, czyli hash (`sha256`) w nagłówku przeliczany **przy każdym
commicie** (hook `pre-commit` już edytuje `index.html`, mógłby też przepisywać `_headers`). To etap drugi.

**Pułapki:** pominięty origin psuje aplikację po cichu (logowanie, realtime, fonty). Testuj na wdrożeniu
podglądowym w przeglądarce stacjonarnej, wszystkie przepływy, z otwartą konsolą (naruszenia CSP są tam widoczne;
na iPhonie PWA trudno). Linki muzyczne używają `location.href` (nie podlega CSP).

---

## 71. Dziennik błędów w ustawieniach (S)

**Co:** dziś żaden nieobsłużony błąd nie jest nigdzie zapisywany, a wiele miejsc ma `catch (e) {}`. Efekt:
"coś nie działa" bez śladu.

**Jak:** na początku IIFE `window.addEventListener('error', …)` i `'unhandledrejection'` wołają
`logErr(gdzie, err)`: dopisuje `{t, v: APP_VERSION, where, msg}` do tablicy w `localStorage`
(`tracker-errlog`, max 20, w `try/catch`, bo zapis może się nie udać). Dodatkowo kilka kluczowych `if (r.error)`
(`cloudPush`, `cloudMeet`, `pushProfile`, `syncPosts`) woła `logErr`. UI: w ustawieniach wiersz "Diagnostics"
z licznikiem, arkusz z listą i przyciskiem "Copy" (`navigator.clipboard`), który dodaje wersję, User-Agent i
liczby (nie dane).

**Pułapki:** nie loguj wartości z danych użytkownika. Wyczyść przy wylogowaniu (klucz do listy w
`leaveDevice`). Kolejny `logErr` w pętli błędów musi mieć limit, żeby nie zapchać pamięci.

**Test:** `logErr` obcina do 20 i nie rzuca przy pełnym `localStorage`.

---

## 72. Hook `pre-push` z testami (S)

**Dlaczego:** Cloudflare wdraża po pushu na `main` **bez** sprawdzania czegokolwiek. Hook `pre-commit`
(podbija `APP_VERSION`) leży w `.git/hooks/` i **nie jest w repo**, więc nowy klon go nie ma.

**Co:** `pre-push`: `node tests/run.js` plus `node --check` na wyciągniętym ostatnim `<script>` z `index.html`
i na `sw.js`; niezerowy kod wyjścia blokuje push (`--no-verify` jako wyjście awaryjne). Wersjonuj hooki:
katalog `scripts/hooks/` + `git config core.hooksPath scripts/hooks`. Wtedy `pre-commit` też trafia do repo
(przepisz go tak, by działał z tej ścieżki).

**Pułapki:** testy trwają kilka sekund. Sprawdź, że `pre-push` nie koliduje z `pre-commit` (ten edytuje plik
w trakcie commita, więc `git add` tego pliku musi być w nim).

---

## 73. Testy dla `sw.js` i dla renderowania cudzych danych (M)

**`sw.js`:** nowy `tests/sw.js`. Załaduj `sw.js` w piaskownicy z atrapami `self`, `caches`, `fetch`, `Request`,
`Response`, zbierz handlery, podstaw zegar. Scenariusze: (a) nawigacja z odpowiedzią 200 aktualizuje kopię;
(b) odpowiedź 500 **nie** nadpisuje kopii i serwowana jest stara; (c) fetch wiszący >3 s serwuje kopię; (d) host
`*.supabase.co` nigdy nie jest przechwytywany; (e) nie-GET ignorowane; (f) zasoby spoza `cacheable` nie trafiają
do cache.

**Renderowanie cudzych danych:** `tests/hostile.js` sprawdza dziś tylko pomocnicze funkcje. Lepiej wołać same
budowniczych HTML (`workoutCard`, fragmenty `drawFrRoutine`, `drawComments`, `drawUser`) z atrapami zależności
i karmić je danymi `<img src=x onerror=alert(1)>` w **każdym** polu tekstowym; asercja: w wyniku nie ma
`<img`, `<script`, ani niezamkniętego `"`. To test właściwościowy, bez jsdom (projekt nie ma zależności).

**Pułapka:** funkcje `draw*` piszą do DOM, a testy nie mają DOM; testuj tylko te, które zwracają ciąg
(`workoutCard`, `actsInner`, `lbCard`, `cmpBars`), a resztę wydziel do funkcji zwracających HTML.
Nowy plik testowy trzeba dopisać do listy `files` w `tests/run.js`.

---

## 74. Limity po stronie serwera (M)

**Stan dziś (`supabase-social.sql`):** komentarz ma `check (char_length(body) between 1 and 500)`. Nic więcej.
**Brak:** limitu rozmiaru `posts.data`, `library.data`, `live_session.data`, `tracker.data` (znajomy z
przerobionym klientem może wstawić kilka MB, a wszyscy jego znajomi pobierają to w feedzie: darmowy plan ma
limit transferu); limitu długości `profiles.name` i `bio`; limitu liczby komentarzy na minutę; ograniczenia
częstości `live_peek` (limit 3 s jest tylko w kliencie).

**Zmierzone (15 listopada 2026), tekst JSON:** `tracker` max 263 KB, `posts` max 4,7 KB (192 wiersze),
`library` max 11 KB, `live_session` pusta; najdłuższe bio 91 znaków, imię 16.

**Propozycja (hojne limity, żaden istniejący wiersz ich nie łamie):**
`check (octet_length(data::text) < 4194304)` na `tracker`, `< 262144` na `posts`, `< 524288` na `library`,
`< 262144` na `live_session`; `check (char_length(name) <= 40 and char_length(bio) <= 200)` na `profiles`;
trigger na `comments` odrzucający >20 komentarzy/min od jednego autora. Mierz `octet_length(data::text)`,
nie `pg_column_size` (ta liczy inaczej przy zapisie i w tabeli). `live_peek`: tabelka z czasem ostatniego
pingu i odrzucenie, gdy <2 s (dodatkowy zapis przy każdym wywołaniu, więc rozważ, czy warto).

Dodaj ograniczenia jako `not valid`, potem `validate`. Najpierw plik SQL, potem `apply_migration`.

**Pułapka:** zbyt ciasny limit sprawi, że `syncPosts` będzie w kółko ponawiał nieudany zapis
(`social.dirty = true`) bez komunikatu dla użytkownika. Limity dobierz hojnie (megabajt na post to bardzo dużo).

---



---

## 137. Bezpiecznik wokół rysowania ekranów (M, ważne)

**Problem:** `render(id)` i `redrawAll()` wołają funkcje `draw*` bez `try/catch`. Wyjątek w jednej przerywa
resztę (inne ekrany się nie odświeżają), a w konsoli widać tylko komunikat, którego na iPhonie nikt nie zobaczy.
**Najgroźniejsze: sekwencja startowa** (`loadStore` → `drawExercises` → `drawRoutines` → `drawHome` →
`drawProfile` → … → `initAuth()`). Wyjątek w `drawHome` przy starcie oznacza, że `initAuth()` **nigdy się nie
wykona**: martwy ekran bez bramki logowania i bez komunikatu. Zepsuty post znajomego mógł to już wywołać.

**Co:** `function safe(name, fn)` łapie wyjątek, wywołuje `logErr` (patrz 71) i wpisuje w ekran prostą
zastępczą notkę ("Couldn't draw this. Pull down to reload."). Owiń: wywołania w `render()`, sekwencję w
`redrawAll()` i każdy `draw*` w sekwencji startowej, tak by `initAuth()` zawsze został wywołany.

**Pułapka:** połknięty błąd = ukryty błąd, więc **bez 71 to jest gorsze niż nic**. Rób oba razem.

**Test:** `safe` jako czysta funkcja (wyjątek → zalogowany, wynik pusty, bez rzucania).

---
