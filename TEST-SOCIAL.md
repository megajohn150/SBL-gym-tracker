# Lista kontrolna — część społecznościowa

Sprzęt: **telefon z kontem głównym** (`freakytriceps`) i **drugie konto** (`freakytest`)
na laptopie albo w trybie prywatnym przeglądarki. Każdy punkt ma „co zrobić" i
„co ma się stać". Zaznaczaj po kolei, bo późniejsze punkty korzystają z wcześniejszych.

---

## 0. Zanim zaczniesz

- [ ] Deploy przeszedł — w Settings na dole zgadza się numer wersji.
- [ ] W Supabase → SQL Editor puszczony `supabase-social.sql` **drugi raz**
      (doszedł warunek na kształt nicka; reszta skryptu nic nie zepsuje).
- [ ] Na obu urządzeniach apka otwarta na świeżo (zamknij i otwórz z homescreenu,
      service worker bierze dokument z sieci).

Zapytania kontrolne do SQL Editora, przydadzą się niżej:

```sql
select username, stats, pic from profiles;
select count(*) from posts where user_id = (select user_id from profiles where username = 'freakytriceps');
select follower, followee from follows;
```

---

## 1. Username

- [ ] Konto bez profilu dostaje ekran **Pick a username** i nie da się go ominąć.
- [ ] `ab` → „Three to twenty characters…".
- [ ] `...` → ten sam komunikat (warunek jest też w bazie).
- [ ] Nick zajęty przez drugie konto → „That one is taken.".
- [ ] Poprawny nick wpuszcza do apki, a `select username from profiles` pokazuje go w bazie.
- [ ] Profile → ikonka ludzika: pole Username jest **tekstem**, nie inputem, obok przycisk **Change**.
- [ ] Change → ostrzeżenie o utracie nazwy → ekran zmiany.
- [ ] Zaraz po zmianie drugi Change → „You can change it again in 30 days".

## 2. Prywatność treningu

- [ ] Ostatnia strona sesji ma przełącznik **Private workout** nad End workout.
- [ ] Trening zakończony z włączonym przełącznikiem **nie pojawia się** u znajomego.
- [ ] Ten sam trening jest u ciebie na Home, w statystykach i w raporcie.
- [ ] ⋮ na skończonym treningu → **Make private** — pigułka `Private` przy nazwie,
      a u znajomego karta znika po odświeżeniu Home.
- [ ] ⋮ → **Share with friends** — wraca.
- [ ] `select count(*) from posts where user_id = …` spada i rośnie razem z tym.
- [ ] Licznik **Workouts** na twoim profilu publicznym liczy tylko publiczne:
      po schowaniu jednego treningu znajomy widzi o jeden mniej.

## 3. Feed na Home

- [ ] Karty znajomych są wymieszane z twoimi, posortowane po dacie.
- [ ] Karta znajomego ma jego avatar i nick, twoja ma numer porządkowy.
- [ ] Stuknięcie w **avatar albo nick** otwiera profil, stuknięcie w resztę karty — trening.
- [ ] Trening znajomego otwiera się bez menu ⋮ i bez różnic `(+120)` przy liczbach.
- [ ] Nagłówek otwartego treningu znajomego też prowadzi na jego profil.
- [ ] Przy wielu treningach na dole jest **Older sessions from friends** i dociąga kolejne 60.
- [ ] Nowy trening zrobiony na drugim koncie pojawia się po powrocie na Home
      (apka odświeża feed raz na minutę, po przełączeniu aplikacji albo po powrocie sieci).

## 4. Profil znajomego

- [ ] Nagłówek: avatar, imię, Workouts / Followers / Following, bio.
- [ ] **Followers** i **Following** otwierają listy — to ludzie tej osoby, nie twoi.
- [ ] Wiersz na liście prowadzi dalej, na kolejny profil.
- [ ] Nad wykresem „X this week", pod nim 13 słupków z ostatnich trzech miesięcy.
- [ ] Stuknięcie w słupek pokazuje `2h 15m · week of 12 Oct`, drugie chowa.
- [ ] Słupki sięgają trzy miesiące wstecz, nie tylko tam gdzie kończy się 30 ostatnich treningów.
- [ ] Sekcja **Routines** z kafelkami `nazwa · N exercises · M sets`.
- [ ] Sekcja **Recent workouts** z kartami i, przy dłuższej historii, **Older sessions**.
- [ ] Nie ma sekcji Exercises ani żadnego „Copy" przy ćwiczeniach.

## 5. Kogoś, kogo nie obserwujesz wzajemnie

- [ ] Przestań obserwować znajomego na jednym koncie.
- [ ] Jego profil pokazuje tylko nagłówek i „Follow each other to see …'s training".
- [ ] Jego treningi znikają z twojego Home.
- [ ] Zapytanie z drugiego konta nie zwraca nic:
      `select count(*) from posts` wykonane **jako ten użytkownik** w apce → 0 cudzych.
- [ ] Zaobserwuj z powrotem — wszystko wraca.

## 6. Rutyny

- [ ] Kafelek rutyny otwiera podgląd, nie kopiuje.
- [ ] Podgląd pokazuje ćwiczenia, Sets, Rep range, Starts with (jednostronne) i cue.
- [ ] Nic w podglądzie nie da się zmienić.
- [ ] ⋮ → **Save routine** → „Routine saved", rutyna jest w twoim Workout.
- [ ] Brakujące ćwiczenia dopisały się z nazwą, skrótem i partią; te, które już miałeś,
      nie zdublowały się.
- [ ] Skopiowana rutyna startuje normalnie i liczy serie od zera (bez cudzej historii).
- [ ] Lista rutyn w Workout wygląda normalnie — pełna szerokość, nie wąski słupek.

## 7. Szukanie i obserwacje

- [ ] Lupa na Home otwiera Find people.
- [ ] Wpisanie początku nicka znajduje osobę, siebie nie pokazuje.
- [ ] Przy wyniku jest etykieta `Friends` / `Following` / `Follows you`, gdy coś was łączy.
- [ ] Follow → przycisk zmienia się na `Following · Unfollow`.
- [ ] Gdy druga strona odda followa: `Friends · Unfollow`.
- [ ] Gdy ktoś obserwuje ciebie, a ty jego nie — kropka przy **Followers** na twoim
      profilu i na kafelku **Friends** w dashboardzie.
- [ ] Dashboard → Friends pokazuje tylko wzajemnych.

## 8. Synchronizacja i koszty

- [ ] Zaloguj się, zrób jedną drobną zmianę (np. edytuj nazwę treningu) i w
      DevTools → Network sprawdź request `POST /rest/v1/posts`: ma zawierać
      **jeden** trening, nie całą historię.
- [ ] Bez zmian w treningach żaden request do `posts`, `library` ani `profiles` nie leci.
- [ ] Tryb samolotowy → skończ trening → wróć do sieci → po chwili trening jest w `posts`.
- [ ] Wyczyść dane strony na urządzeniu pomocniczym i zaloguj się ponownie:
      po pobraniu historii liczba wierszy w `posts` **nie spada**.
- [ ] Wyloguj się i zaloguj na drugie konto na tym samym urządzeniu — nicki, feed
      i statystyki się nie mieszają.

## 9. Regresja reszty apki

- [ ] Klawiatura liczbowa: wpisywanie wagi i powtórzeń, obciążniki, backspace, −1/+1.
- [ ] Usunięcie liczby z zaznaczonej serii zdejmuje ptaszka.
- [ ] Kalendarz: Month / Year / Multi-year, brak przesuwania na boki.
- [ ] Statistics: Set count, Distribution z dropdownem zakresu, Body z sylwetką i tygodniami.
- [ ] Monthly report: tytuł ostatniego **zamkniętego** miesiąca, słupki, Summary,
      Workout days, radar, Main muscle groups, Personal records z pucharkiem i rozwijaniem.
- [ ] Alert o raporcie na Home: zamknięcie i wejście w raport chowają go do końca miesiąca.
- [ ] Usunięty trening nie wraca po ponownym otwarciu apki.
