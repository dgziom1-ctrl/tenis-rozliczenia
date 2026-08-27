import { Component, Suspense } from 'react';
import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import { isStaleBuildError, recoverFromStaleBuild } from '@/utils/bootRecovery';
import { CLIP } from '@/constants/styles';

// Pusty fallback zamiast spinnera: strony ładują się z tego samego bundla w
// ułamku sekundy, a migający placeholder byłby bardziej widoczny niż samo
// oczekiwanie.
function PageFallback() {
  return null;
}

/**
 * Osłona wokół jednej zakładki.
 *
 * Bez niej błąd wczytania paczki leci aż do korzenia i zabiera całą aplikację —
 * nagłówek, nawigację i wszystko inne. Tutaj psuje się wyłącznie zawartość
 * zakładki, więc użytkownik może przejść gdzie indziej albo spróbować ponownie.
 *
 * `React.lazy` zapamiętuje odrzuconą obietnicę importu, więc samo przemontowanie
 * niczego nie naprawi — jedyną realną naprawą jest świeże wczytanie strony.
 */
interface RouteErrorState {
  error: Error | null;
  /** Naprawa przeładowuje właśnie stronę — nie ma po co pokazywać komunikatu. */
  recovering: boolean;
}

interface RouteErrorProps {
  /** Komponent bieżącej zakładki. Jego zmiana oznacza przejście na inną trasę. */
  page: unknown;
  children: ReactNode;
}

class RouteErrorBoundary extends Component<RouteErrorProps, RouteErrorState> {
  override state: RouteErrorState = { error: null, recovering: false };

  static getDerivedStateFromError(error: Error): Partial<RouteErrorState> {
    return { error };
  }

  /**
   * Router renderuje wszystkie zakładki tym samym komponentem w tym samym miejscu
   * drzewa, więc React zachowuje tę instancję przy zmianie trasy i błąd zostałby
   * na ekranie już na zawsze. Dziś ratuje to `key` na `<main>` w `Layout`, ale ten
   * klucz istnieje dla animacji wejścia — skasowanie go zepsułoby nawigację
   * w sposób nie do odgadnięcia. Dlatego czyścimy błąd sami.
   */
  override componentDidUpdate(previous: RouteErrorProps): void {
    if (previous.page !== this.props.page && this.state.error) {
      this.setState({ error: null, recovering: false });
    }
  }

  override componentDidCatch(error: Error): void {
    console.error('Nie udało się wczytać zakładki:', error);

    // Brakująca paczka po wdrożeniu naprawia się sama, bez pytania użytkownika.
    // Naprawa może jednak odmówić — na przykład offline, gdy przeładowanie i tak
    // niczego nie da. Wtedy trzeba pokazać komunikat, bo inaczej użytkownik
    // zostałby z pustym miejscem po treści.
    this.setState({ recovering: isStaleBuildError(error) && recoverFromStaleBuild(error) });
  }

  override render(): ReactNode {
    const { error, recovering } = this.state;
    if (!error) return this.props.children;

    // Naprawa potrafi zająć kilkanaście sekund (odświeżenie plików, czyszczenie
    // cache), a puste miejsce po treści wygląda jak zawieszona apka.
    if (recovering) {
      return (
        <p role="status" style={{
          padding: '24px 20px', textAlign: 'center', margin: 0,
          fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
          letterSpacing: '0.1em', color: 'var(--co-dim)',
        }}>
          Naprawiam i przeładowuję...
        </p>
      );
    }

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    return (
      <div role="alert" style={{
        padding: '24px 20px', textAlign: 'center',
        background: 'var(--co-tint-rose)', border: '1px solid var(--co-tint-rose-line)',
        clipPath: CLIP.card,
      }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--co-rose)', fontSize: '1rem',
        }}>
          Nie udało się otworzyć tej zakładki
        </p>
        <p style={{
          margin: '6px 0 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: 'var(--co-dim)', letterSpacing: '0.06em', lineHeight: 1.6,
        }}>
          {offline
            ? 'Brak połączenia — tej zakładki nie ma jeszcze w pamięci offline.'
            : 'Pozostałe zakładki działają normalnie.'}
        </p>
        <button onClick={() => window.location.reload()} className="cyber-button-yellow"
          style={{ padding: '10px 20px' }}>
          ↻ Odśwież
        </button>
      </div>
    );
  }
}

export function LazyPage({ Component: Page }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <RouteErrorBoundary page={Page}>
      <Suspense fallback={<PageFallback />}>
        <Page />
      </Suspense>
    </RouteErrorBoundary>
  );
}
