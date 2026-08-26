import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { onValue, ref } from 'firebase/database';
import { subscribeToData, database, loadSnapshot, buildUIData, setCurrentData } from '@/lib/firebase';
import { useToast } from '@/components/common/Toast';
import type { UIData } from '@/types/ui';
import { AppDataContext, INITIAL_APP_DATA, type AppDataContextValue } from './appDataContext';

const SLOW_LOADING_AFTER_MS = 8000;

/**
 * Ostatnie znane dane, odczytane z pamięci urządzenia.
 *
 * Liczone raz, poza komponentem: to jednorazowy odczyt na start, a nie stan,
 * który mógłby się zmieniać. Odczyt jest w bloku `try`, bo uszkodzony wpis
 * w magazynie nie może stać się nowym sposobem na zepsucie uruchomienia.
 */
function readCachedData(): UIData | null {
  try {
    const cached = loadSnapshot();
    if (!cached) return null;
    const ui = buildUIData(cached);
    setCurrentData(cached);
    return ui;
  } catch (error) {
    console.warn('Zapamiętane dane są nieczytelne — startuję bez nich:', error);
    return null;
  }
}

/**
 * Po tym czasie interfejs wchodzi na ekran, nawet jeśli baza jeszcze nie
 * odpowiedziała.
 *
 * `onValue` z Firebase nie zgłasza błędu, gdy nie da się nawiązać połączenia —
 * SDK po cichu ponawia próbę bez końca. Bez tego terminu ani wywołanie sukcesu,
 * ani błędu nigdy nie przychodzi i aplikacja zostaje na ekranie startowym na
 * zawsze, z przyciskiem „Retry”, który zakłada dokładnie ten sam nasłuch.
 */
const BOOT_GATE_DEADLINE_MS = 15000;

export function AppDataProvider({ children }: { children: ReactNode }) {
  // Start od ostatnich znanych danych. Dzięki temu apka otwiera się z treścią
  // nawet bez sieci, zamiast pokazywać puste listy i wyglądać na zepsutą.
  // `hasData` jest wtedy od razu prawdziwe, więc ekran startowy w ogóle nie mruga,
  // a baner nad treścią informuje, że dane mogą nie być świeże.
  const [cachedData] = useState(readCachedData);
  const [appData, setAppData] = useState<UIData>(cachedData ?? INITIAL_APP_DATA);
  const [hasData, setHasData] = useState(cachedData !== null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [slowLoading, setSlowLoading] = useState(false);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const { showError } = useToast();

  const retry = useCallback(() => setRetryNonce(n => n + 1), []);

  useEffect(() => {
    setIsLoading(true);
    setSlowLoading(false);
    setSubscriptionError(null);
    // `bootTimedOut` celowo nie wraca do `false` przy ponowieniu: kto raz zobaczył
    // interfejs, nie powinien po kliknięciu „Ponów” wrócić na pełnoekranowy ekran
    // startowy. Ponowienie działa w tle, a o stanie mówi baner nad treścią.

    const slowTimer = setTimeout(() => setSlowLoading(true), SLOW_LOADING_AFTER_MS);
    const gateTimer = setTimeout(() => setBootTimedOut(true), BOOT_GATE_DEADLINE_MS);
    const stopWaiting = () => {
      clearTimeout(slowTimer);
      clearTimeout(gateTimer);
    };

    const unsub = subscribeToData(
      (data) => {
        stopWaiting();
        setAppData(data);
        setHasData(true);
        setIsLoading(false);
        setSlowLoading(false);
        setSubscriptionError(null);
      },
      (error, kind) => {
        stopWaiting();
        if (kind === 'data') {
          // Połączenie działa, ale jeden snapshot był wadliwy — NIE kasujemy
          // działającej aplikacji, pokazujemy tylko dyskretny komunikat.
          console.error('Data processing error:', error);
          showError('Nie udało się przetworzyć części danych — pokazuję ostatni poprawny stan.');
          setIsLoading(false);
          setSlowLoading(false);
          return;
        }
        // Błąd połączenia — pełny ekran błędu tylko wtedy, gdy nie mamy żadnych danych.
        setSubscriptionError(error);
        setIsLoading(false);
        setSlowLoading(false);
      },
    );

    return () => {
      stopWaiting();
      if (typeof unsub === 'function') unsub();
    };
  }, [retryNonce, showError]);

  // Rzeczywisty stan połączenia z bazą (nie polega na niepewnym navigator.onLine).
  useEffect(() => {
    const connRef = ref(database, '.info/connected');
    const unsub = onValue(connRef, (snap) => setIsConnected(snap.val() === true));
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  /**
   * O połączenie NIE walczymy na siłę — i to jest decyzja, nie przeoczenie.
   *
   * Była tu warstwa, która przy braku połączenia sama zamykała je i otwierała od
   * nowa (`goOffline` + `goOnline`), żeby obudzić SDK po powrocie sieci. Skutek
   * był odwrotny do zamierzonego: przy starcie połączenia jeszcze nie ma, więc
   * mechanizm uruchamiał się od razu i przerywał SDK dokładnie w chwili
   * uzgadniania łącza. Na telefonie, gdzie uzgadnianie trwa dłużej niż odstęp
   * między próbami, aplikacja nie łączyła się już nigdy — na żadnym urządzeniu,
   * także po wyczyszczeniu danych.
   *
   * SDK samo ponawia próby i po powrocie sieci połączy się w ciągu kilkudziesięciu
   * sekund. Do tego czasu widać ostatnie znane dane i baner z przyciskiem
   * ponowienia. Wolniej, ale bez ryzyka, że aplikacja nie wstanie wcale.
   */

  const value = useMemo<AppDataContextValue>(() => ({
    appData, hasData, isConnected, isLoading, slowLoading, bootTimedOut, subscriptionError, retry,
  }), [appData, hasData, isConnected, isLoading, slowLoading, bootTimedOut, subscriptionError, retry]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
