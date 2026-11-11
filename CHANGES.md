# Zmiany z sesji (3.4258 → 3.4272)

1. Pasek tygodnia na Home

Pod nagłówkiem trzy kafelki: treningi w tym tygodniu, serie względem sumy celów serii i seria tygodni. Gdy jest ustawiony cel tygodniowy, pierwszy kafel pokazuje „2 / 4" i robi się zielony po jego osiągnięciu. Paddingi i odstępy zmniejszone, tak samo przerwa pod napisem „Home".

2. Filtr feedu All / Me / Friends

Pokazuje się tylko wtedy, gdy w feedzie są sesje znajomych. Wybór jest zapamiętany.

3. Czerwona kropka offline

Po napisie „Profile" w dolnym pasku, gdy synchronizacja zgłasza „Offline". Znika po udanym zapisie.

4. Share image po treningu

Przycisk na ekranie podsumowania. Robi obrazek w kolorach i kroju pisma Twojej skórki i otwiera arkusz udostępniania (albo pobiera PNG).

5. Czcionki lokalnie

Inter, JetBrains Mono, Newsreader i Fraunces (z polskimi znakami) leżą w aplikacji, żadnych żądań do Google. Zapisane w cache service workera.

6. Przypomnienie o backupie

W Settings → Data wiersze „Last backup" i „Backup reminder" (włączenie i własna liczba dni, domyślnie 30). Po upływie czasu na Home pojawia się karta „Time for a backup", tapnięcie robi eksport, krzyżyk odkłada o dobę.

7. Previous versions

Raz dziennie lokalna kopia całych danych (IndexedDB na telefonie), zostaje 7 ostatnich. W Settings → Data można przywrócić dowolną, a obecny stan zapisuje się wcześniej jako kolejna wersja. Każde konto widzi tylko swoje kopie. Kopie znikają przy wylogowaniu i usunięciu ikony z ekranu głównego.

8. Szybszy start przy słabym sygnale

Service worker czeka na sieć maksymalnie 3 sekundy, potem startuje z zapisanej kopii, a wolne pobieranie kończy się w tle.

9. Duplicate routine

W menu ⋮ widoku rutyny. Kopia ląduje pod oryginałem i nie jest udostępniana ani obserwowana.

10. Weekly recap

Nowy ekran w Stats z podsumowaniem tygodnia: treningi z różnicą względem poprzedniego, pasek pon–niedz, czas, objętość, serie, seria tygodni, rozkład mięśni (3 pozycje i „See N more") i rekordy. Karta „Your week is wrapped" na Home pokazuje się w niedziele.

11. Przeglądanie tygodni w recapie

Strzałki i swipe (w prawo starszy, w lewo nowszy). Granice: nie dalej niż tydzień pierwszego treningu i nie w przyszłość. Wybrany tydzień obowiązuje do wyjścia z widoku, wtedy znów pokazuje bieżący.

12. Share w recapie

Ikona w prawym górnym rogu. Robi obrazek wybranego tygodnia: zakres, treningi z celem, czas, objętość, serie, seria, rekordy i pięć najczęstszych mięśni.

13. Cel tygodniowy

W Weekly targets na samej górze wiersz „Total" z jednym polem (1–7 treningów w tygodniu). Pokazuje się na pasku tygodnia i w nagłówku recapu.

14. Estimate czasu rutyny

Nad nazwą rutyny wiersz brzmi „1 exercise · 3 sets · 60 mins". Czas to średnia z ostatnich 5 treningów tej rutyny (z mniejszej liczby, jeśli ich jest mniej). Bez żadnego treningu estymaty nie ma. Czas jest klikalny (delikatne podkreślenie) i otwiera listę tych treningów z ich czasami.

15. Time w widoku rutyny

Obok Volume i Reps trzeci przycisk wykresu: czas najdłuższego treningu w każdym przedziale.

16. Cache feedu

Feed pobiera lekką listę i tylko nowe albo zmienione treningi w całości. Edycje i usunięcia znajomych działają jak wcześniej. Przy błędzie sieci feed się już nie czyści. Wylogowanie kasuje cache.

17. Porównanie ćwiczenia ze szczegółów treningu znajomego

Wspólne ćwiczenie (oboje macie ciężar, masz je na liście) ma podkreślony nagłówek. Tapnięcie otwiera pełne porównanie tego ćwiczenia, a wstecz wraca do treningu.

18. Odznaka serii na profilu znajomego

„N week streak" w rzędzie z czasem „this week", po prawej, od 2 tygodni, w trzech stopniach wyglądu (poniżej 4, od 4, od 12).

19. Push z recapem

W niedzielę o 20:00 czasu polskiego baza wysyła „Your week is wrapped. Tap to see how it went." każdemu, kto ma włączone powiadomienia i trenował w tym tygodniu. Tapnięcie otwiera recap. Godzina jest stała zimą i latem.

20. Poprawka serii tygodni

Seria nigdy nie liczyła bieżącego tygodnia i bywała zaniżona o jeden. Poprawka działa wszędzie: profil własny i znajomych, recap, miesięczny raport, odznaka.
