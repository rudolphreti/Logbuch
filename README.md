# Logbuch Studio

Edytor WYSIWYG pirackiego dziennika wykorzystujący **dwa szablony z repozytorium**: pierwszą stronę `1a4a62cc-f6f3-4fad-b27c-0229b282b101.png` oraz drugą stronę `5ea0771d-2f7f-4574-a89c-82a7d4339f16.png` dodaną przez użytkownika. Użytkownik pracuje bezpośrednio na stronach: dodaje dziewięć zdjęć (1 + 8), przesuwa je w ramkach i wpisuje tekst we właściwych miejscach. Interfejs po polsku; nadruki oryginalnego szablonu pozostają po niemiecku.

## Uruchomienie

Wymagany Node.js 20 lub nowszy. Brak zależności i kluczy API.

```sh
cd /workspace/Logbuch
npm run dev
```

Domyślny port: 3000. Inny port: `npm run dev -- --port 5173` lub zmienna `PORT`.

```sh
npm test
npm run build
```

`dist/` zawiera statyczną aplikację do dowolnego hostingu HTTP. Do sprawdzenia kompilacji lokalnie: `SERVE_DIST=1 npm start`.

## Produkcja: GitHub Pages + Actions

**`main` jest gałęzią produkcyjną.** Każdy push do `main` uruchamia workflow [Deploy to GitHub Pages](https://github.com/rudolphreti/Logbuch/actions/workflows/deploy-pages.yml): testy, kompilację `dist/` i wdrożenie. Nieudane testy lub kompilacja blokują publikację. Ręczne uruchomienie workflow wdraża wyłącznie gałąź `main`.

Jednorazowa konfiguracja repozytorium:

1. Otwórz [Settings → Pages](https://github.com/rudolphreti/Logbuch/settings/pages).
2. W **Build and deployment → Source** wybierz **GitHub Actions**.
3. Otwórz [Actions → Deploy to GitHub Pages](https://github.com/rudolphreti/Logbuch/actions/workflows/deploy-pages.yml). Jeśli pierwszy przebieg zakończył się przed włączeniem Pages, wybierz **Re-run all jobs**. Możesz też wybrać **Run workflow**, gałąź **main**, i potwierdzić **Run workflow**.
4. Po sukcesie zadania **Deploy production** aplikacja będzie dostępna pod adresem **https://rudolphreti.github.io/Logbuch/**.

Jeśli Actions są wyłączone w repozytorium, włącz je w **Settings → Actions → General** i zezwól na oficjalne akcje `actions/*`. Jeżeli środowisko `github-pages` ma ustawione wymagane zatwierdzenia, zatwierdź wdrożenie w widoku przebiegu.

Nie trzeba dodawać sekretów, serwera Node ani osobnej gałęzi `gh-pages`. Workflow używa wbudowanego `GITHUB_TOKEN` z uprawnieniami do Pages wyłącznie w zadaniu wdrożenia. Aplikacja oraz moduły, arkusz CSS i szablony używają ścieżek względnych, więc działają pod `/Logbuch/`.

Adres produkcyjny ma osobny zapis IndexedDB względem uruchomienia lokalnego. Aby przenieść dotychczasową pracę, wyeksportuj JSON w poprzednim miejscu i zaimportuj go na stronie produkcyjnej.

## Korzystanie

- Kliknij pustą ramkę na stronie lub upuść na nią zdjęcie JPG, PNG lub WebP. Przycisk „Dodaj zdjęcia” pozwala też wypełnić pozostałe ramki wieloma zdjęciami naraz.
- Kliknij zdjęcie i przeciągnij je wewnątrz ramki. Tuż przy nim pojawia się mały pasek: zoom, wymiana, reset kadru i usunięcie. Kółko myszy również zmienia skalę. Zdjęcia można swobodnie przesuwać poza dawne ograniczenia kadru; odsłonięte miejsce jest białe. Rolka myszy zmienia skalę łagodnie wokół punktu pod kursorem. Na telefonie jeden palec przesuwa zdjęcie, a dwa palce zmieniają skalę, obrót i położenie jednocześnie. Kąt można też wpisać w stopniach lub zmienić przyciskami obrotu o 90°. Zdjęcia można dowolnie pomniejszać, także poniżej rozmiaru ramki: przyciski −/+ działają proporcjonalnie, a pole procentowe przyjmuje dowolną dodatnią wartość. Puste miejsce w kadrze jest białe. Mniejsze zdjęcia można przesuwać wewnątrz ramki. Strzałki klawiatury przesuwają aktywny kadr; Shift zwiększa krok. Ramka przycina zdjęcie.
- Kliknij miejsce tekstowe **bezpośrednio na szablonie i pisz**. Nie ma bocznych formularzy ani osobnego trybu tekstowego. Tekst na stronie aktualizuje się w trakcie pisania. Escape kończy edycję; Enter kończy edycję pojedynczego wiersza; Ctrl/Cmd+Enter kończy edycję akapitu. Dłuższy tekst jest zawijany i zmniejszany, aby mieścił się w obszarze.
- Wszystkie zdjęcia i teksty są dostępne równocześnie. Na telefonie domyślnie wyświetlana jest jedna strona, a wybrane pole tekstowe przybliża się do edycji.
- Cofnij i ponów przywracają także usunięte lub wymienione zdjęcia. Ctrl/Cmd+Z i Ctrl/Cmd+Shift+Z działają poza edytowanymi polami tekstowymi.
- „Eksportuj → Pobierz PNG” zapisuje **dwa osobne pliki PNG po 1054 × 1492 px**, z nazwami zakończonymi `-strona-1.png` i `-strona-2.png`, bez oznaczeń edytora. Ten sam renderer Canvas obsługuje podgląd i eksport. Pobieranie obu plików rozpoczyna się jednym kliknięciem. W oknie eksportu pozostają też linki do każdej strony — również gdy przeglądarka ogranicza pobieranie wielu plików naraz.
- JSON zawiera cały projekt, w tym osadzone zdjęcia, kadry, teksty i nastrój. Import zastępuje projekt po zweryfikowaniu pliku i odczytaniu zdjęć. Można go cofnąć.

## Przechowywanie

IndexedDB przechowuje aktualny projekt w tej samej przeglądarce i pod tym samym adresem (origin). Nie ma backendu ani wysyłania zdjęć. Zdjęcia są lokalnie zmniejszane do maksymalnie 2400 px i kodowane do JPEG. Zapis jest automatyczny, po edycji tekstu z opóźnieniem 250 ms; zmiana widoczności strony dodatkowo zapisuje stan.

Wyczyszczenie danych witryny, tryb prywatny, zmiana przeglądarki lub adresu mogą usunąć/odseparować zapis. JSON służy jako przenośna kopia zapasowa. Błędy i brak miejsca są sygnalizowane; interfejs nie deklaruje wtedy poprawnego zapisu.

## Architektura i szablony

`templates.js`: współrzędne i wektorowe maski wnętrz dziewięciu ramek oraz obszary tekstowe. Obie strony są rysowane na płótnie 1054 × 1492; maski zdjęć i pola tekstowe używają współrzędnych tego płótna. `core.js`: walidacja projektu i geometria kadrowania. `app.js`: Canvas, IndexedDB, obsługa plików i interfejs. Pliki źródłowe grafik pozostają niezmienione. Dotychczasowe projekty IndexedDB i JSON nadal się wczytują; zdjęcia zachowują numery, a obie strony używają nowego układu ramek.

Testy `npm test` sprawdzają zgodność danych szablonu, kadrowanie i pozycjonowanie zdjęć większych i mniejszych od ramki, przenośność projektu i odrzucanie nieprawidłowego importu.

## Szablony Pepper

Strona 1 używa `1a4a62cc-f6f3-4fad-b27c-0229b282b101.png`, a strona 2 — `5ea0771d-2f7f-4574-a89c-82a7d4339f16.png`. Osiem ramek na drugiej stronie obejmuje małą ramkę z liny. Nowe grafiki mają 1055 × 1491 px i są skalowane do dotychczasowego eksportu 1054 × 1492 px. Pola tekstowe odpowiadają liniom na pierwszej stronie. Dawne podpisy, historia, towarzysz i nastrój pozostają w danych JSON, lecz nie są rysowane na nowych grafikach, które nie mają dla nich miejsc.

Test gestów dotykowych Chromium: przy uruchomionej aplikacji wykonaj `python tests/crop-browser.py` (Playwright i Pillow). Obejmuje przesuwanie, gest dwoma palcami, przejścia między jednym a dwoma palcami, cofanie/ponawianie i odtworzenie zapisu. Starsze kadry JSON nadal są odczytywane; nowe przesunięcia zapisują się w polach `offsetX` i `offsetY` w pikselach płótna.

Obrót zdjęcia jest zapisywany w JSON jako `rotation` w stopniach; starsze projekty bez tego pola używają kąta 0°. Reset kadru zeruje również obrót. Maski ramek z liny, obroży i budy odwzorowują wewnętrzny kontur nowych grafik.
