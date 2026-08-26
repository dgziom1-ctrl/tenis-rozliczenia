/**
 * Rejestracja Service Workera aplikacji.
 *
 * Worker daje dwie rzeczy: apka otwiera się bez sieci i przestaje zależeć od
 * kaprysów cache HTTP przeglądarki. Rejestrujemy go przy każdym starcie, a nie
 * dopiero przy włączaniu powiadomień — inaczej większość osób nigdy go nie
 * dostaje, a te, które włączą push, dostają go w losowym momencie.
 */

const SW_URL = '/firebase-messaging-sw.js';

/** Jak często dopytujemy o nową wersję apkę trzymaną otwartą przez wiele dni. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

/** Minimalny odstęp między sprawdzeniami, niezależnie od tego, co je wywołało. */
const UPDATE_THROTTLE_MS = 60 * 1000;

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Nowy worker przejął stronę, a ta działa jeszcze na plikach starego wydania.
 *
 * Nazwy paczek zawierają hash treści, więc te wczytywane leniwie (osobne
 * zakładki) po wdrożeniu już nie istnieją — pierwsze przejście na inną zakładkę
 * skończyłoby się błędem. Przeładowanie to naprawia, ale nie robimy tego pod
 * palcami użytkownika: w tej apce wypełnia się formularze sesji i wpłat, a nagły
 * restart wyczyściłby wpisane dane. Czekamy więc, aż karta zejdzie z ekranu.
 * Gdyby w tym czasie zabrakło jakiejś paczki, zajmie się tym straż startu.
 */
function reloadWhenHiddenOnControllerChange(): void {
  // Brak kontrolera przy starcie oznacza pierwszą w życiu rejestrację. Wtedy
  // `controllerchange` to nie aktualizacja, tylko normalne przejęcie strony.
  if (!navigator.serviceWorker.controller) return;

  let pending = false;

  const reloadIfHidden = () => {
    if (!pending || document.visibilityState !== 'hidden') return;
    document.removeEventListener('visibilitychange', reloadIfHidden);
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pending) return;
    pending = true;
    document.addEventListener('visibilitychange', reloadIfHidden);
    reloadIfHidden();
  });
}

function scheduleUpdateChecks(registration: ServiceWorkerRegistration): void {
  let lastCheck = Date.now();

  const check = () => {
    // Każde sprawdzenie to żądanie sieciowe, a przełączanie się między apkami
    // na telefonie potrafi wywołać je kilka razy w minutę.
    if (Date.now() - lastCheck < UPDATE_THROTTLE_MS) return;
    lastCheck = Date.now();
    registration.update().catch(() => { /* brak sieci — sprawdzimy następnym razem */ });
  };

  // Powrót do apki to najlepszy moment na sprawdzenie: użytkownik i tak czeka
  // na odświeżenie danych, a ewentualne przeładowanie nie przerywa mu pracy.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.setInterval(check, UPDATE_INTERVAL_MS);
}

/**
 * Rejestruje workera i pilnuje jego aktualizacji. Wielokrotne wywołanie zwraca
 * tę samą rejestrację, więc panel powiadomień może z niej korzystać bez
 * wyrejestrowywania czegokolwiek.
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (registrationPromise) return registrationPromise;

  // W trybie deweloperskim worker przechwytywałby żądania serwera Vite
  // i psuł podmianę modułów na gorąco.
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    registrationPromise = Promise.resolve(null);
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      reloadWhenHiddenOnControllerChange();
      const registration = await navigator.serviceWorker.register(SW_URL, {
        // Bez tego przeglądarka może podać skrypt workera ze swojego cache
        // i poprawka do samego workera nie dotarłaby do użytkownika.
        updateViaCache: 'none',
      });
      scheduleUpdateChecks(registration);
      return registration;
    } catch (error) {
      // Apka musi działać także bez workera (tryb prywatny, zablokowane
      // magazyny), więc to ostrzeżenie, a nie błąd.
      console.warn('Rejestracja Service Workera nie udała się:', error);
      // Zapamiętana porażka odcięłaby worker i powiadomienia do końca życia
      // strony, także po chwilowym błędzie sieci. Pozwalamy spróbować ponownie.
      registrationPromise = null;
      return null;
    }
  })();

  return registrationPromise;
}
