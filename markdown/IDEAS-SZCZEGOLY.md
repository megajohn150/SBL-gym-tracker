# Pomysły: instrukcje dodania

Numeracja z listy 150 pomysłów. Rozmiary: **S** do godziny, **M** wieczór, **L** kilka podejść.

---

## 39. Podpowiedź mięśnia w formularzu ćwiczenia (S)

**Co:** `hevyMuscle(name)` (dziś używana tylko przy imporcie Hevy) zgaduje mięsień po nazwie, po polsku i
angielsku. Formularz nowego ćwiczenia (`#ex-name`, `#ex-muscle`, `fillExForm`) ją ignoruje i zawsze zaczyna od "Chest".

**Jak:** w handlerze `input` na `#ex-name` (jest `syncExForm`), gdy to nowe ćwiczenie (`!exEditId`), selecta nie
ruszono ręcznie (flaga `exMuscleTouched`, zerowana w `fillExForm`) i select nie jest zablokowany (`pickMuscle`
ustawia `mus.disabled`), ustaw `#ex-muscle.value = hevyMuscle(name) || bieżąca`.

**Pułapki:** dla `Shoulders` formularz wymaga głowy (`exValid`), więc trzeba też ustawić `#ex-head`
(np. "lateral/side" → Side delt, "rear/face pull/reverse" → Rear delt, reszta Front delt) albo zostawić puste
i zablokować Zapisz do wyboru. Kolejność wzorców w `HEVY_MUSCLE` ma znaczenie ("face pull" łapie się jako
Upper back). Zgadywanie bywa błędne, więc zmiana musi być widoczna, nie ukryta.

**Test:** wytnij `HEVY_MUSCLE` + `plainName` + `hevyMuscle` i sprawdź ~15 nazw.

---

## 42. Tablica tygodnia wśród znajomych (M)

**Co:** kto z ekipy ile trenował w tym tygodniu (treningi, serie, objętość) w jednym miejscu.

**Dane:** `profiles.stats` ma tylko `workouts` (suma), `streak` i `records`, **nie ma liczb tygodniowych**.
Zalecana droga: liczyć z feedu. `social.feed` to posty znajomych (RLS: tylko znajomi), pierwsza strona to 60 sztuk,
czyli przy kilku znajomych starcza na tydzień. Po stronie klienta `statsFor(monday, +7, listaPostów)` (funkcja
przyjmuje cudzą listę). Zero nowych danych publikowanych. Dodawanie `stats.week` do `myStats()` odradzam,
bo `profiles` czyta każdy zalogowany i ujawniałoby to aktywność obcym.

**Gdzie:** karta na Home nad feedem albo w ekranie znajomych (`openPeople('friends')`).

**Pułapki:** feed cache może być nieaktualny do najbliższego `loadFeed`; użyj `postOk`; znajomy bez postów =
0, nie "brak"; tydzień liczony od poniedziałku (`monday()`), uważaj na `Math.ceil` przy "tygodni temu".

**Test:** czysta funkcja `weekBoard(feed, mine, now)` + dane z `fake-supabase`.

---

## 51. Stany puste z jednym przyciskiem (S)

**Stan dziś:** Home ma trzykrokową listę startową (`#home-empty`, kroki `hw-1..3`). Reszta to same napisy:
"Nothing logged yet." (`#p-empty`, profil i `drawUser`), "Nothing matches that." (`#p-none`), "Nobody yet." /
"Follow each other and they show up here." (`#people-note`), "Search by username." (`#find-note`),
"No routines yet." (`drawUser`), "No exercise you both have a weight for." (Compare), "No workouts in the last
72 hours." (gotowość). Puste bloki `.empty` mają też `#routine-empty`, `#ex-empty`, `#notes-empty`
(zawartości nie sprawdzałem, obejrzyj przed zmianą).

**Co:** tam, gdzie następny krok jest oczywisty, dodać jeden przycisk: profil pusty → "Start a workout"
(`goTab('workout')`), lista znajomych pusta → "Find people" (`push('find')`). Tam, gdzie kroku nie ma (cudzy
profil, Compare), nic nie dodawaj.

**Pułapka:** teksty UI są po angielsku i krótkie. Przyciski przez istniejące `data-push` / `data-tabgo`
(delegowane handlery), nie przez nowe listenery.

---

## 52. Sygnał "offline, zmiany czekają" (S)

**Stan dziś:** `syncDot(on)` zapala czerwoną kropkę przy zakładce Profil, gdy ostatnia synchronizacja dała
`err`; `#set-sync` w ustawieniach pokazuje "Saving… / Synced / Offline". `cloud.dirty` to tylko wartość logiczna.

**Co:** po stuknięciu kropki albo na Home mały baner: "Offline: zmiany są zapisane na telefonie i polecą, gdy
wróci sieć" + przycisk "Retry" (`cloudPush()`).

**Licznik:** "N zmian" **nie da się** wiarygodnie policzyć dziś (sygnatura jest jedna na cały sklep). Wymagałoby
`cloud.pending++` w `saveStore`. Zacznij od banera bez liczby.

**Pułapki:** nie pokazuj przy każdym przejściowym błędzie (zdarzają się przy wybudzeniu telefonu), użyj
progu (np. dwa błędy z rzędu albo >10 s). Chowaj po `syncState('ok')`. Zdarzenie `online` już woła `cloudPush`.

---

## 54. Mikroanimacje liczb (S, niski priorytet)

**Co:** licznik treningów/serii/objętości płynnie dobiega do nowej wartości.

**Pułapki:** `paint()` ustawia `innerHTML`, więc elementy są za każdym razem nowe: animacja startowałaby przy
każdym `drawHome` (też od pingów), co wygląda jak migotanie. Trzeba zapamiętywać ostatnio pokazaną wartość
per klucz i animować tylko przy zmianie. `requestAnimationFrame` nie działa w ukrytej karcie, więc ekran
zrobiony w ukrytym podglądzie wymaga zrzutu, żeby wymusić klatkę. Aplikacja nie ma żadnego
`prefers-reduced-motion`, więc przy dodaniu animacji dodaj i to. Wartość użytkowa mała.

---

## 58. Udostępnianie wykresu jako obrazek (M)

**Co:** przycisk na wykresie (historia ćwiczenia, widok rutyny, profil) robi obrazek z tytułem, bieżącą
wartością, zakresem i samym wykresem.

**Jak:** wykresy to HTML/SVG (`chartBody(buckets, style, xp, tipOf)`), więc trzeba **przerysować na canvasie**
z tych samych `buckets` (`{from,to,v,lab,pr}`), używając `shareCanvas`. Wyciągnij z `chartBody` logikę skali
(`base`, `top`, `hOf`, krok etykiet `step`) do wspólnej funkcji, żeby canvas i HTML nie rozjechały się.

**Pułapki:** styl linia/słupki (`xStyle`), puchary PR (`b.pr`), `vmin`/`base` dla linii, kolory z `c('--accent')`.
Etykiety osi tak jak w HTML. Przycisk w `.pchart-h` obok `styleToggle`.

**Test:** wspólna funkcja skali jako czysta; porównaj z wartościami z `chartBody`.

---

## 63. Pokaż/ukryj hasło i zapamiętany e-mail (S)

**Stan dziś:** ekran logowania ma `#au-email` i `#au-pass` (`type="password"`, `autocomplete` przełączane w
`setAuMode`); zmiana hasła w arkuszu `#acc-sheet` używa `#acc-a` (typ przełączany) i `#acc-b` (powtórz).

**Co:** ikona oka w polu hasła przełącza `type` text/password. Opcjonalnie: po udanym logowaniu zapamiętaj sam
e-mail (`save('lastmail', email)`), wypełnij przy następnym wejściu.

**Pułapki:** nie psuj autofill iOS (zostaw `autocomplete`); wróć do ukrytego przy zmianie trybu i zamknięciu
bramki; `aria-pressed` + `aria-label`. **Jeśli zapamiętujesz e-mail, dopisz klucz do listy w `leaveDevice`**
(`['uid','music','data','session']`), bo wylogowanie ma nie zostawiać nic po koncie.

---

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

## 67. Eksport CSV w formacie zbliżonym do Hevy (S do M)

**Stan dziś:** jest import (`hevyParse`, `csvRows`, `hevyImport`), eksportu CSV nie ma (tylko JSON, `exportData`).

**Co:** drugi format eksportu z arkusza wyboru (tak jak `imp-sheet`): jeden wiersz = jedna zalogowana seria.
Kolumny, które czyta nasz import: `title`, `start_time`, `end_time`, `description`, `exercise_title`,
`exercise_notes`, `set_type`, `weight_kg`, `reps`, `rpe`. Dodaj też `set_index`.

**Reguły:** `start_time` w formacie `27 Oct 2026, 09:22` (angielskie skróty `MONTHS`), `end_time` = start +
`seconds`. `set_type`: `normal`, a seria z RIR `F` → `failure`. `rpe` = 10 − RIR (gdy RIR liczbowy), pusty gdy
brak. Seria jednostronna to dwa wiersze (jak w danych). Cudzysłowy: pola z przecinkiem, cudzysłowem lub nową
linią w `"..."`, `"` podwajane (odwrotność `csvRows`).

**Pułapki:** nie obiecuj, że Hevy to zaimportuje (nie sprawdzałem); gwarantowana jest zgodność z naszym
importerem i arkuszami. Utrata: rutyny, płytki, pomijane ćwiczenia, cele. CSV nie jest pełną kopią, więc
**nie ustawiaj `bk-last`** (przypomnienie o backupie ma liczyć tylko eksport JSON).

**Test:** pętla eksport → `hevyParse` → porównanie liczby treningów, serii, ciężarów (wytnij obie funkcje).

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

## 114. Gęstość kart w feedzie (S)

**Co:** przełącznik "Compact" przy filtrze All/Me/Friends na Home. Karta (`workoutCard`) składa się z `.wtop`,
`.wpr`, `.wstats3`, `.wex` (trzy ćwiczenia), `.wmore`, `actsBox`.

**Jak (najtaniej, tylko CSS):** klasa `.dense` na `#home-list` (i `#p-feed`), zapamiętana w
`save('feedd', 'dense')`; reguły ukrywają `.wex`, `.wmore`, zmniejszają `.wstats3`. Przełącznik obok
`#feed-filter` (handler jak `data-ff`).

**Pułapki:** pięć skórek ma własne marginesy kart (sprawdź w Cocoa, jedną); przyciski lajk/komentarz zostają
dostępne; `paint()` przepisuje zawartość `#home-list`, ale nie jego klasy, więc klasa przeżywa.

---

## 131. Baner "Dodaj do ekranu głównego" (S)

**Dlaczego:** powiadomienia push działają **tylko** w zainstalowanej aplikacji (`drawPushRow` pokazuje
"Install the app to your home screen first"). Znajomy, który otworzy adres w Safari, nigdy ich nie dostanie i
nie wie dlaczego.

**Co:** gdy aplikacja nie działa w trybie samodzielnym (`navigator.standalone !== true` oraz
`!matchMedia('(display-mode: standalone)').matches`) i to iOS Safari, pokaż baner z instrukcją
("Share → Add to Home Screen"), odrzucalny (`save('a2hs', '1')`). Miejsca: Home (jak `bk-bar`) i ekran logowania.

**Pułapka:** `localStorage` Safari i zainstalowanej aplikacji to **dwa osobne magazyny**: dane z karty
przeglądarki nie przechodzą do ikony. Po zalogowaniu synchronizacja z chmury je przyniesie, ale lokalne
ustawienia (skórka, przerwy) i niewysłane zmiany z karty nie. Powiedz to w tekście banera.

---

## 133. Miernik zajętego miejsca i czyszczenie (S)

**Co jest zajęte:** `localStorage` (limit rzędu 5 MB na origin): klucz `data` (cały sklep), `feed-<id>`
(cache feedu), `sigs-<id>`, `session`; IndexedDB `tracker-snaps` (do siedmiu pełnych kopii sklepu); cache
Service Workera (fonty ≈ 620 KB, obrazy ≈ 1 MB, `body.svg` 417 KB, supabase-js).

**Co:** w ustawieniach wiersz "Storage": `navigator.storage.estimate()` (użycie/limit, Safari 17+) i rozbicie
liczone z długości `JSON.stringify` kluczy; przyciski "Clear feed cache" (bezpieczne, odbuduje się z serwera
kosztem transferu) i "Clear previous versions" (**z potwierdzeniem**, to kopie bezpieczeństwa). **Nigdy** nie
dawaj przycisku kasującego sklep.

**Pułapka:** `save()` połyka błąd zapisu przy pełnej pamięci (`try/catch` bez reakcji), więc miernik bez
ostrzeżenia o nieudanym zapisie to tylko połowa rozwiązania. Dodaj toast, gdy `localStorage.setItem` rzuci.

---

## 134. Więcej jednorazowych podpowiedzi + reset (S do M)

**Stan dziś:** są dwie (`tipNow` = `'sets'` / `'fill'`, klucze `tip-sets`, `tip-fill`, element `#sess-tip`
tylko na ekranie sesji, `tipDone`). Ukryte gesty bez żadnej podpowiedzi: ciągnięcie w dół odświeża (pull to
refresh), przesunięcie od lewej krawędzi cofa, długie przytrzymanie lajka pokazuje kto polubił, przytrzymanie
backspace na klawiaturze czyści pole, przytrzymanie słońca/księżyca zmienia motyw, medal otwiera arkusz rekordu,
dotknięcie słupka pokazuje wartość, przesunięcie w recapie zmienia tydzień.

**Co:** uogólnić do `tip(key, text, anchorSelector)` pokazującego jeden dymek raz, przy pierwszym wejściu na
dany ekran, z zapisem `save('tip-' + key, 1)`. W ustawieniach "Show tips again" kasuje klucze `tracker-tip-*`.

**Pułapki:** tylko jedna podpowiedź na sesję i nigdy w trakcie wpisywania serii; nie nakładaj na toasty;
`tipNow` ma już swoje miejsce na ekranie sesji, więc nie duplikuj mechanizmu, tylko go uogólnij.

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

## 139. Dokładniejsza walidacja importu JSON (S)

**Stan dziś:** `importData` sprawdza tylko `Array.isArray(raw.exercises)` i `Array.isArray(raw.workouts)`, po czym
**wstawia tablice bez zmian** do `store` i pcha do chmury. Plik z innej aplikacji, ręcznie edytowany albo
uszkodzony (treningi bez `exercises`, serie bez `label`, zła data, brak `id`) zepsuje `drawHome`, kalendarz i
statystyki, a zła zawartość trafi do wiersza `tracker` i do `posts` (znajomi dostaną to w feedzie).

**Co:** normalizator `cleanWorkout(w)`: wymagaj `id` (nadaj `uid()` jeśli brak, i usuń duplikaty id), poprawnej
daty (`isFinite(new Date(w.date))`, inaczej odrzuć), `exercises` jako tablicy obiektów z tablicą `sets`, w której
`label` jest tekstem, a `weight`/`reps`/`rir` zamieniaj na teksty. Użyj istniejącego `postOk` jako predykatu.
Policz odrzucone i powiedz w oknie potwierdzenia: "N treningów pominięto".

**Test:** śmieciowe JSON-y (puste, tablica zamiast obiektu, trening bez serii, dwa razy to samo `id`).
