/**
 * Naprawa trwałego przejścia bazy w tryb „offline”, którego nie da się cofnąć.
 *
 * SDK Firebase zapisuje w `localStorage` flagę `firebase:previous_websocket_failure`
 * — i robi to PRZED każdą próbą połączenia WebSocketem, z komentarzem „zakładamy
 * porażkę, dopóki nie okaże się inaczej”. Usuwa ją tylko wtedy, gdy połączenie
 * okaże się zdrowe. Jeśli więc w trakcie łączenia zniknie sieć albo system zamknie
 * aplikację, flaga zostaje w magazynie — i przeżywa zamknięcie apki.
 *
 * Przy następnym uruchomieniu SDK widzi tę flagę i wybiera zamiast WebSocketa
 * długie odpytywanie (long-polling). A ono działa przez wstrzykiwanie znaczników
 * `<script src="https://…firebasedatabase.app/.lp?…">`, które Content-Security-Policy
 * musi wprost dopuszczać (patrz `script-src` w `firebase.json`).
 *
 * Tak powstawała awaria opisywana jako „apka wpadła w tryb offline i nie wychodzi”:
 * jedno mignięcie sieci ustawiało flagę na stałe, transport przełączał się na
 * gorszy, a restart aplikacji nic nie dawał, bo flaga leżała w magazynie. Pomagało
 * wyłącznie wyczyszczenie danych przeglądarki — bo to ją usuwało.
 *
 * Dlatego kasujemy ją przy każdym starcie: niech SDK zawsze zaczyna od WebSocketa,
 * który w tej aplikacji działa. Gdy sieć naprawdę blokuje WebSocket, SDK i tak
 * przejdzie na długie odpytywanie w tej samej sesji — koszt to jedna nieudana
 * próba, a nie trwałe zepsucie połączenia.
 */

/** Klucz z `DOMStorageWrapper` w `@firebase/database` (prefiks `firebase:`). */
const WEBSOCKET_FAILURE_KEY = 'firebase:previous_websocket_failure';

export function clearStaleTransportPreference(): void {
  try {
    localStorage.removeItem(WEBSOCKET_FAILURE_KEY);
  } catch {
    // Brak magazynu (tryb prywatny). SDK sam uzna wtedy, że WebSocket zawiódł,
    // i pójdzie w długie odpytywanie — dlatego CSP musi je dopuszczać.
  }
}
