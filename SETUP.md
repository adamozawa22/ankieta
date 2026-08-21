# Ankieta G4 — setup (za darmo, bez własnego backendu)

## 1. Supabase
Możesz użyć **tego samego projektu co Genzie Hub** albo założyć nowy (supabase.com — free plan wystarcza).

1. Wejdź w **SQL Editor** → wklej całą zawartość `supabase-schema.sql` → **Run**.
   Tworzy tabele `g4_codes`, `g4_questions`, `g4_answers`, funkcje RPC i RLS.
2. Wejdź w **Authentication → Users → Add user** i utwórz siebie jako admina
   (email + hasło). Tym logujesz się na `/admin.html`.
3. Skopiuj **Project URL** i **anon public key** z **Project Settings → API**.

## 2. Konfiguracja frontu
W pliku `supabase-config.js` podmień:
```js
const SUPABASE_URL = 'https://TWOJ-PROJEKT.supabase.co';
const SUPABASE_ANON_KEY = 'TWOJ-ANON-KEY';
```
Ten sam plik jest wczytywany przez `index.html`, `survey.html`, `status.html`, `admin.html` —
zmieniasz w jednym miejscu.

## 3. Pliki do wgrania na Netlify
- `index.html`
- `survey.html`
- `status.html`
- `admin.html` (panel — nie linkuj go nigdzie publicznie, wejdziesz bezpośrednio przez URL)
- `style.css`
- `supabase-config.js`

## 4. Jak to działa
- **index.html** — skan QR / wpisanie kodu → sprawdza kod przez RPC `check_code`.
- **survey.html** — pyta o pytania z tabeli `g4_questions`, wysyła przez RPC `submit_answers`
  (zapisuje odpowiedź + oznacza kod jako wykorzystany w jednej transakcji).
- **status.html** — odpytuje RPC `get_status` co 4s, aż admin ustawi decyzję.
- **admin.html** — logowanie Supabase Auth → generowanie kodów (RPC `admin_generate_code`,
  QR generowany za darmo przez api.qrserver.com, bez żadnego klucza) + podgląd zgłoszeń
  i przyciski Zakwalifikuj/Odrzuć.

## 5. Edycja pytań
Wejdź do Supabase → **Table Editor → g4_questions** i edytuj wiersze bezpośrednio —
bez ruszania kodu. Kolumny:
- `type`: `yesno` / `scale` / `choice` / `text`
- `options`: dla `choice` — JSON w stylu `[{"label":"Opcja A"},{"label":"Opcja B"}]`
- `min`/`max`: dla `scale`
- `order_num`: kolejność pytań

## 6. Bezpieczeństwo
Zwykli użytkownicy (anon key) nie mają bezpośredniego dostępu do tabel `g4_codes` i
`g4_answers` — wszystko idzie przez funkcje RPC, więc nikt z konsoli przeglądarki nie
ustawi sobie sam "qualified". Dostęp do tabel wprost mają tylko zalogowani (Supabase Auth) —
czyli Ty w panelu admina.
