# Zmiany z tej sesji

Wersje 3.4258 → 3.4272. Same zmiany w aplikacji i na serwerze, bez kodu. Kolejność jest chronologiczna.

## Home

- **Pasek tygodnia.** Pod nagłówkiem trzy kafelki: treningi w tym tygodniu (pon–niedz), serie względem sumy celów serii oraz seria tygodni. Gdy ustawiony jest cel tygodniowy (patrz niżej), pierwszy kafel pokazuje `2 / 4` i robi się zielony po osiągnięciu celu. Bez żadnych treningów pasek się nie pokazuje.
- **Filtr feedu All / Me / Friends.** Pokazuje się tylko wtedy, gdy w feedzie są sesje znajomych. Wybór jest zapamiętany.
- **Ciaśniejszy układ.** Mniejsze paddingi paska tygodnia i filtra, mniejsza przerwa pod napisem „Home". Zmiana dotyczy tylko Home.
- **Karta „Time for a backup".** Pojawia się, gdy ostatni eksport jest starszy niż ustawiona liczba dni. Tapnięcie robi eksport, krzyżyk odkłada przypomnienie o dobę.
- **Karta „Your week is wrapped".** Pokazuje się w niedziele i prowadzi do tygodniowego recapu. Krzyżyk chowa ją do końca tygodnia.

## Weekly recap (Stats → Weekly recap)

- Nowy ekran z podsumowaniem tygodnia: liczba treningów (z różnicą względem poprzedniego tygodnia), pasek pon–niedz z nazwami treningów (tapnięcie otwiera trening), czas, objętość, serie, seria tygodni, rozkład mięśni i rekordy tygodnia.
- **Rozkład mięśni** pokazuje 3 pozycje i przycisk „See N more", który rozwija resztę.
- **Przeglądanie tygodni:** strzałki ‹ › na górze oraz swipe (w prawo starszy, w lewo nowszy). Granice: nie można wyjść w przyszłość ani cofnąć dalej niż do tygodnia z pierwszym treningiem. Wybrany tydzień obowiązuje do wyjścia z widoku, potem znów pokazuje bieżący. Wejście w trening z paska dni i powrót nie resetuje.
- **Share w prawym górnym rogu.** Robi obrazek wybranego tygodnia (zakres, treningi z celem, czas, objętość, serie, seria, rekordy, pięć najczęstszych mięśni).
- **Cel tygodniowy w nagłówku:** `1 / 4 workouts`, gdy cel jest ustawiony.

## Podsumowanie treningu i obrazki

- **Przycisk „Share image"** na ekranie podsumowania po treningu. Robi obrazek w kolorach i kroju pisma aktualnej skórki. Na iPhonie otwiera arkusz udostępniania, gdzie go nie ma, pobiera PNG.
- Obrazek podsumowania i obrazek recapu korzystają z jednej wspólnej funkcji.

## Rutyny

- **Czas w karcie rutyny:** `5 exercises · 18 sets · 62 mins`. To średnia z ostatnich 5 treningów tej rutyny (z mniejszej liczby, jeśli ich jest mniej). Bez żadnego treningu nic się nie pokazuje.
- **Czas jest klikalny** (z bardzo delikatnym podkreśleniem). Tapnięcie otwiera okienko z ostatnimi treningami tej rutyny i ich czasami.
- **Duplicate routine** w menu ⋮ widoku rutyny. Kopia ląduje pod oryginałem, nie jest udostępniana ani obserwowana. Dla rutyn obserwowanych nadal jest „Make it mine".
- **Widok rutyny, wykres:** obok Volume i Reps nowy trzeci przycisk **Time** (czas najdłuższego treningu w każdym przedziale).

## Cele (Stats → Set count → Weekly targets)

- Na samej górze nowy wiersz **Total** z jednym polem: ile treningów w tygodniu (jedna cyfra, 1–7). Cel pokazuje się na pasku tygodnia na Home i w recapie.

## Znajomi

- **Szczegóły treningu znajomego:** jeśli ćwiczenie jest wspólne (oboje macie zapisany ciężar i masz je na swojej liście), nagłówek jest podkreślony. Tapnięcie otwiera pełne porównanie tego ćwiczenia (1RM, najcięższy ciężar itd.), a wstecz wraca do treningu. Dla własnych treningów nic się nie zmieniło.
- **Odznaka serii** („N week streak") na profilu znajomego, w jednym rzędzie z czasem „this week", po prawej (tam, gdzie u Ciebie jest zakres 1/3/6 miesięcy). Pokazuje się od 2 tygodni, w trzech stopniach wyglądu: poniżej 4 tygodni, od 4, od 12. Widzą ją tylko znajomi.

## Feed i transfer

- **Cache feedu.** Przy odświeżeniu pobierana jest lekka lista (kto, który trening, kiedy zmieniony), a pełne dane tylko dla nowych albo zmienionych treningów. Edycje i usunięcia znajomych działają jak wcześniej. Pierwsze pobranie jest takie samo jak przedtem.
- **Feed nie czyści się przy błędzie sieci** (wcześniej nieudane zapytanie opróżniało go do zera).
- Nowy test `tests/feed.js` (6 scenariuszy), dodany do `tests/run.js`.

## Niezawodność i dane

- **Czcionki lokalnie.** Inter, JetBrains Mono, Newsreader i Fraunces (warianty latin i latin-ext, czyli z polskimi znakami) leżą w `public/fonts/` i w cache service workera. Aplikacja nie łączy się już z Google Fonts. Wersja cache workera: `tracker-v11`.
- **Szybszy start przy słabym sygnale.** Service worker czeka na sieć maksymalnie 3 sekundy, potem startuje z zapisanej kopii, a wolne pobieranie kończy się w tle i odświeża kopię na następny raz.
- **Czerwona kropka po napisie „Profile"** w dolnym pasku, gdy synchronizacja zgłasza „Offline". Znika po udanym zapisie.
- **Backup (Settings → Data):** nowe wiersze „Last backup" (kiedy był ostatni eksport) i „Backup reminder" (włącz/wyłącz oraz własna liczba dni, 1–365, domyślnie 30). Eksport zapisuje datę ostatniego backupu.
- **Previous versions (Settings → Data).** Raz dziennie przy otwarciu aplikacji zapisuje się lokalna kopia całych danych (IndexedDB na telefonie), zostaje 7 ostatnich. Z listy można przywrócić dowolną: najpierw zapisuje się obecny stan jako kolejna wersja, a przywrócona kopia nadpisuje dane na telefonie i w chmurze. Każde konto widzi tylko swoje kopie. Kopie znikają przy usunięciu ikony z ekranu głównego i przy wylogowaniu.
- **Wylogowanie** kasuje teraz też cache feedu i kopie z „Previous versions" (obietnica „This device keeps no copy").
- Okno potwierdzenia pokazuje się nad innymi arkuszami.

## Poprawiony błąd

- **Seria tygodni nigdy nie liczyła bieżącego tygodnia.** Trening po poniedziałku dawał indeks −1 zamiast 0, więc seria przy treningach tylko w tym tygodniu pokazywała 0, a w innych przypadkach była zaniżona o jeden. Poprawka działa wszędzie, gdzie seria jest liczona (profil własny i znajomych, recap, miesięczny raport, odznaka).

## Serwer (Supabase)

- **Push z recapem.** W niedzielę o 20:00 czasu polskiego baza wysyła powiadomienie „Your week is wrapped. Tap to see how it went." każdemu, kto ma włączone powiadomienia i trenował w tym tygodniu. Tapnięcie otwiera ekran Weekly recap, zarówno przy zamkniętej, jak i otwartej aplikacji.
- Zadanie crona `weekly-recap` budzi się w niedzielę o 18:00 i 19:00 UTC, a funkcja puszcza tylko tę godzinę, która w Warszawie jest 20:00. Dzięki temu godzina jest stała zimą i latem.
- Dwie migracje (`weekly_recap_push`, `weekly_recap_push_at_20_warsaw`), funkcja `notify` w wersji 4 (`verify_jwt` bez zmian) i nowa sekcja w `supabase-social.sql`.

## Rzeczy, które zrobiłem, a potem wycofałem

- Klikanie nazw ćwiczeń na kartach znajomych (z 3 ćwiczeniami) otwierające ranking. Wycofane, zastąpione wersją w szczegółach treningu.
- Ekran „All records" w Stats (lista wszystkich rekordów). Dodany do oceny, potem usunięty.
- Tygodniowy recap przez jakiś czas pokazywał się codziennie (tryb pokazowy). Wyłączony.

## Rzeczy, których nie robiłem

- **Podwójne tapnięcie = like.** Zepsułoby natychmiastowe otwieranie treningu z karty, więc odpuszczone.
- **Kopie w chmurze** (wersja D2 w bazie). Zostaje wersja lokalna.
- **Ochrona przy End workout** i **Undo przy usuwaniu**: okazały się już istnieć w aplikacji.

## Pamięć asystenta

- Dopisana reguła: logika i nawigacja nie są powodem do otwierania przeglądarki, tylko zmiany wyglądu (i wtedy w skórce Cocoa).
