import { MAX_PLAYER_NAME_LENGTH } from './validation';

/** Wpis w `fcmTokens/$tokenKey` — dokładnie te pola dopuszczają reguły bazy. */
export interface PushTokenEntry {
  token: string;
  playerName: string;
  updatedAt: number;
  ua: string;
}

/**
 * Kształt wpisu rejestracji powiadomień push.
 *
 * Trzymany osobno od hooka, bo reguły bazy odrzucają nieznane pola i za długie
 * wartości, a `rulesParity.test.js` sprawdza na tym obiekcie, że to, co
 * zapisujemy, faktycznie przechodzi walidację. Wcześniej przycinanie długości
 * żyło wyłącznie w hooku i test nie miał czego pilnować.
 *
 * Przycinamy tu, a nie w regułach: użytkownik z nazwą dłuższą niż 40 znaków
 * (albo przeglądarka z długim user agentem) dostałby wcześniej „Permission
 * denied” przy rejestracji push, bez żadnej wskazówki o przyczynie.
 */
export function buildTokenEntry(input: {
  token: string;
  playerName?: string;
  ua?: string;
  updatedAt?: number;
}): PushTokenEntry {
  return {
    token: input.token.slice(0, 4096),
    playerName: (input.playerName || 'unknown').slice(0, MAX_PLAYER_NAME_LENGTH),
    updatedAt: input.updatedAt ?? Date.now(),
    ua: (input.ua ?? '').slice(0, 100),
  };
}
