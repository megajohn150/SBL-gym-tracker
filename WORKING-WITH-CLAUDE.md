# Jak pracować z Claude'em na tym projekcie

Notatka dla mnie, nie dla Claude'a — on czyta `CLAUDE.md`. Ta jest o tym, jak wyciskać
więcej przy mniejszym zużyciu limitu.

## Trzy nawyki warte najwięcej

1. **Nowy czat po skończonym temacie.** Cała historia czatu jedzie z każdą kolejną
   wiadomością, więc pod koniec długiej sesji każde zdanie kosztuje wielokrotnie więcej
   niż na starcie. `CLAUDE.md` ładuje się automatycznie, więc nowy czat jest od razu
   w kontekście. To największa oszczędność i nie wymaga żadnego wysiłku.
2. **Nazwa funkcji albo ekranu w pierwszym zdaniu.** „W `applyFollow` strona startowa nie
   przeżywa zmiany u właściciela" to jeden grep. „Napraw followowanie rutyn" to przeszukanie
   pół pliku. Nie znasz nazwy? Wystarczy objaw i ekran.
3. **„Pokaż mi dane, nie teorię."** Gdy coś zachowuje się dziwnie, od razu każ wstawić log
   i zobaczyć, co tam naprawdę jest. 5 listopada 2026 dwie rundy rozumowania dały dwie
   niewłaściwe poprawki; trzy linie logu w konsoli rozwiązały sprawę w pięć sekund.

## Czego unikać

- **Ciężkich narzędzi na tym repo.** `/graphify` kosztował 428 tysięcy tokenów i dał jedną
  przydatną listę (duplikaty funkcji, są już w `CLAUDE.md`). Przy jednym pliku, który Claude
  zna, `CLAUDE.md` jest tańszy i lepszy.
- **„Sprawdź wszystko" bez powodu.** Pełny audyt to realny koszt. Przy małej zmianie mów
  wprost: „tylko ta funkcja".
- **Weryfikacji w przeglądarce przy drobiazgach.** Postawienie serwera, zasianie danych
  i przeklikanie to kilkanaście wywołań. Przy zmianie tekstu czy koloru wystarczy, że Claude
  przeczyta, a Ty zobaczysz u siebie.
- **Powtarzania tych samych zasad co czat.** Jak coś ma obowiązywać zawsze, powiedz
  „zapamiętaj to" — trafi do pamięci projektu i będzie działać za darmo w każdej sesji.

## Komendy, i kiedy

| Komenda | Kiedy |
|---|---|
| `node tests/run.js` | po każdej zmianie w logice. Sekundy, zero tokenów, 43 asercje |
| `/code-review low` albo `medium` | zwykła zmiana przed wypchnięciem |
| `/code-review ultra` | tylko przed czymś, co ma nie paść — odpala wiele agentów w chmurze, jest drogie |
| `/ponytail` | wymusza najmniejszą działającą zmianę i uczciwe „czego nie sprawdziłem" |
| `/ponytail ultra` | gdy chcesz usłyszeć „tego w ogóle nie buduj" |
| `/init` | tylko gdy architektura realnie się zmieniła, nie po każdej zmianie |

## O tym projekcie konkretnie

- Testy w `tests/` wycinają funkcje prosto z `index.html`, więc nie rozjadą się z kodem.
  Jak coś naprawiacie w synchronizacji albo followowaniu — poproś o test, następnym razem
  ten sam błąd złapie się za darmo.
- Claude nie może się zalogować do aplikacji (nie ma hasła), więc wszystko za bramką
  logowania sprawdza przez zasianie `localStorage` albo przez te testy w node.
- Supabase wgrywa się ręcznie przez dashboard. Jak Claude mówi „wklej SQL", to znaczy, że
  nie ma jak zrobić tego za Ciebie — nie ma CLI na tym Macu.
