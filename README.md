# System ankiety kwalifikacyjnej G4

Kompletny system: dostęp przez jednorazowy kod QR lub kod numeryczny,
ankieta, baza danych (SQLite), panel admina z generowaniem kodów
i podejmowaniem decyzji, oraz strona statusu dla osoby wypełniającej
ankietę (odświeża się automatycznie do momentu decyzji).

## 1. Wymagania

- Node.js w wersji 18 lub nowszej (sprawdź: `node -v`)

## 2. Instalacja

```bash
cd g4-survey
npm install
cp .env.example .env
```

Otwórz plik `.env` i **koniecznie zmień**:
- `ADMIN_USER` / `ADMIN_PASS` — login i hasło do panelu admina
- `SESSION_SECRET` — dowolny losowy ciąg znaków

## 3. Uruchomienie

```bash
npm start
```

Serwer wystartuje na `http://localhost:3000` (port można zmienić w `.env`).

- Strona dla uczestnika: `http://localhost:3000/`
- Panel admina: `http://localhost:3000/admin/login.html`

## 4. Jak to działa

1. **Admin** loguje się do panelu i generuje np. 15 jednorazowych kodów
   (przycisk „Generuj kody + QR"). Dla każdego kodu powstaje obrazek QR
   (zapisywany w `public/qrcodes/`), który można wydrukować lub wysłać.
2. **Uczestnik** wchodzi na stronę główną, skanuje kod QR telefonem
   (przycisk „Skanuj kod QR", wymaga dostępu do kamery w przeglądarce)
   **albo** — jeśli nie ma kamery — wpisuje 6-cyfrowy kod ręcznie.
3. Po poprawnym kodzie otwiera się ankieta. Kod jest jednorazowy —
   po wysłaniu odpowiedzi automatycznie blokuje się w bazie danych
   (`status = used`) i nie da się go użyć drugi raz.
4. Uczestnik trafia na stronę statusu, która pokazuje „oczekuj na decyzję"
   i sama odświeża się co kilka sekund.
5. **Admin** w zakładce „Zgłoszenia" widzi wszystkie odpowiedzi, wyliczony
   wynik punktowy oraz automatyczną sugestię (na podstawie progu
   punktowego z `config/questions.js`). Klika „Zakwalifikuj" lub „Odrzuć"
   — to jest ostateczna decyzja.
6. Strona statusu uczestnika natychmiast (przy kolejnym odświeżeniu)
   pokazuje wynik: zakwalifikowany / odrzucony.

## 5. Edycja pytań ankiety

Wszystkie pytania są w pliku **`config/questions.js`**. Możesz tam:
- dodawać/usuwać pytania,
- zmieniać typy: `yesno` (tak/nie), `scale` (ocena liczbowa),
  `choice` (wybór jednej opcji), `text` (odpowiedź opisowa, nie liczy
  się do punktacji),
- zmieniać wagi punktowe oraz próg kwalifikacji (`QUALIFICATION_THRESHOLD`)
  — to tylko sugestia widoczna w panelu, ostateczną decyzję zawsze
  podejmuje admin ręcznie.

Zmiany w tym pliku widać od razu po restarcie serwera (`npm start`).

## 6. Baza danych

Baza to plik SQLite: `db/g4.sqlite` (tworzy się automatycznie przy
pierwszym uruchomieniu). Zawiera dwie tabele:
- `codes` — wygenerowane kody i ich status (unused/used)
- `submissions` — odpowiedzi, wynik punktowy, sugestia i decyzja admina

Możesz ją przeglądać dowolnym narzędziem do SQLite (np. rozszerzenie
"SQLite Viewer" w VS Code, albo `sqlite3 db/g4.sqlite`).

## 7. Wdrożenie „na żywo" (żeby działało poza Twoim komputerem)

Do produkcyjnego użycia (żeby uczestnicy spoza Twojej sieci mogli
otworzyć link) potrzebujesz hostingu z Node.js, np. Railway, Render,
Fly.io albo własny VPS. Wystarczy:
1. Wgrać cały folder projektu (bez `node_modules`),
2. Ustawić zmienne środowiskowe z `.env` w panelu hostingu,
3. Uruchomić `npm install && npm start`.

Pamiętaj, żeby strona była pod **HTTPS** — skanowanie kamerą (dostęp do
`getUserMedia`) w przeglądarkach działa tylko na `https://` albo
`localhost`.

## 8. Bezpieczeństwo — o czym pamiętać

- Zmień domyślne hasło admina w `.env` przed uruchomieniem produkcyjnym.
- Kody są 6-cyfrowe i losowe — przy większej skali (setki/tysiące osób)
  warto rozważyć dłuższe kody, żeby utrudnić zgadywanie.
- Panel admina nie ma obecnie limitu prób logowania (rate limiting) —
  jeśli ankieta ma być dostępna publicznie przez dłuższy czas, warto
  dodać taki mechanizm.
