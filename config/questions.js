// =========================================================================
// PYTANIA ANKIETY KWALIFIKACYJNEJ DO GRUPY G4
// =========================================================================
// Edytuj tę tablicę wedlug wlasnych potrzeb.
//
// type: "yesno"   -> pytanie tak/nie
// type: "choice"  -> pytanie jednokrotnego wyboru (options: [...])
// type: "scale"   -> ocena liczbowa (min, max)
// type: "text"    -> odpowiedz tekstowa (nie liczy sie do punktacji)
//
// "weight" to liczba punktow doliczana do wyniku gdy odpowiedz jest
// "pozytywna" (dla yesno: "tak" daje punkty; dla choice: kazda opcja
// moze miec wlasna wartosc punktowa w "points"; dla scale: wartosc * weight)
// =========================================================================

const QUESTIONS = [
  {
    id: "q1",
    type: "yesno",
    text: "Czy masz wczesniejsze doswiadczenie w tym obszarze?",
    weight: 10,
  },
  {
    id: "q2",
    type: "scale",
    text: "Jak oceniasz swoj poziom zaangazowania w skali 1-5?",
    min: 1,
    max: 5,
    weight: 4,
  },
  {
    id: "q3",
    type: "choice",
    text: "Ile czasu tygodniowo mozesz poswiecic?",
    options: [
      { label: "Mniej niz 2h", points: 0 },
      { label: "2-5h", points: 5 },
      { label: "5-10h", points: 10 },
      { label: "Powyzej 10h", points: 15 },
    ],
  },
  {
    id: "q4",
    type: "text",
    text: "Dlaczego chcesz dolaczyc do grupy G4? (krotko opisz)",
  },
  // Dodaj kolejne pytania ponizej, kopiujac powyzszy wzorzec.
];

// Prog punktowy, od ktorego wynik jest sugerowany jako "kwalifikuje sie".
// To tylko SUGESTIA widoczna w panelu admina - ostateczna decyzje
// (kwalifikuje sie / nie kwalifikuje sie) zawsze podejmuje osoba
// zalogowana w panelu admina recznie.
const QUALIFICATION_THRESHOLD = 15;

module.exports = { QUESTIONS, QUALIFICATION_THRESHOLD };
