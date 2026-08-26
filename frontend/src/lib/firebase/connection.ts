import { goOffline, goOnline } from 'firebase/database';
import { database } from './config';

/**
 * Wymuszone wznowienie połączenia z bazą.
 *
 * SDK Firebase po zerwaniu łącza ponawia próby z coraz dłuższym odstępem (do
 * kilkudziesięciu sekund) i nie słucha zdarzeń sieciowych przeglądarki. Po
 * przełączeniu internetu w telefonie potrafi więc długo czekać, mimo że sieć już
 * działa — a na ekranie widać wtedy aplikację bez danych. Dodatkowo gniazdo
 * zerwane przez system bywa przez SDK uznawane za żywe aż do wygaśnięcia TCP.
 *
 * `goOffline` + `goOnline` zamyka to, co zostało, zeruje odstęp między próbami
 * i otwiera nowe połączenie natychmiast. To jedyny sposób, żeby zrobić to
 * z poziomu aplikacji — SDK nie udostępnia niczego łagodniejszego.
 */

/** Krócej niż tyle od poprzedniej próby nie ma sensu — zrywalibyśmy własne połączenie. */
const RECONNECT_COOLDOWN_MS = 4000;

let lastAttempt = 0;

export function forceReconnect(): boolean {
  if (Date.now() - lastAttempt < RECONNECT_COOLDOWN_MS) return false;
  lastAttempt = Date.now();

  try {
    goOffline(database);
    goOnline(database);
    return true;
  } catch (error) {
    // Nieudane wznowienie nie może wywrócić aplikacji — kolejna próba przyjdzie
    // z nadzoru połączenia w `AppDataProvider`.
    console.warn('Nie udało się wznowić połączenia z bazą:', error);
    return false;
  }
}

/** Tylko dla testów: kasuje odstęp między próbami. */
export function resetReconnectCooldown(): void {
  lastAttempt = 0;
}
