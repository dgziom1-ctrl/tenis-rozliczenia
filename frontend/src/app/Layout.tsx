import { Outlet, useNavigate, useLocation, useNavigationType, NavigationType } from 'react-router';
import { useState, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import PWAInstallBanner from '@/components/common/PWAInstallBanner';
import BootSequence from '@/components/common/BootSequence';
import FirstRunGuide from '@/components/common/FirstRunGuide';
import AnnualRecapNotice from '@/components/attendance/AnnualRecapNotice';
import { useAttendanceData, useConnectionStatus } from './providers/appDataContext';
import { useThemeContext } from './providers/themeContext';
import { useAudio } from '@/hooks/useAudio';
import { useGlassPointer } from '@/hooks/useGlassPointer';
import { useScrolled } from '@/hooks/useScrolled';
import { useSettledFlag } from '@/hooks/useSettledFlag';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { useForegroundNotifications, useNotificationNavigation } from '@/hooks/useNotifications';
import { readStorage, writeStorage } from '@/utils/storage';
import { SOUND_TYPES, TABS, TAB_PATHS } from '@/constants';
import { TriangleAlert } from 'lucide-react';
import { CLIP, FONT, TEXT } from '@/constants/styles';
import type { LayoutContext } from './layoutContext';

/**
 * Kolejność zakładek w nawigacji — wyznacza kierunek animacji wejścia
 * (w prawo do dalszej zakładki, w lewo do wcześniejszej).
 */
const TAB_ORDER: Record<string, number> = {
  [TABS.DASHBOARD]: 0,
  [TABS.ATTENDANCE]: 1,
  [TABS.ADMIN]: 2,
  [TABS.HISTORY]: 3,
  [TABS.PLAYERS]: 4,
};

/**
 * Tyle musi trwać brak połączenia z bazą, zanim pokażemy o nim baner. Na starcie
 * łącze zestawia się zwykle w 1–2 s; bez zwłoki baner mignął przy każdym wejściu.
 */
const OFFLINE_NOTICE_DELAY_MS = 4000;

/** Klucz przewodnika. Wersja w nazwie pozwala pokazać nowe wprowadzenie po
 *  dużej zmianie produktu bez cofania decyzji użytkownika. */
const GUIDE_STORAGE_KEY = 'cyberponk.guide.v1';

export default function Layout() {
  const [isMuted, setIsMuted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected, hasData, bootTimedOut, retry } = useConnectionStatus();
  const { history, players } = useAttendanceData();
  const isOffline = useSettledFlag(!isConnected, OFFLINE_NOTICE_DELAY_MS);
  const { theme, toggle: toggleTheme } = useThemeContext();
  const scrolled = useScrolled();
  const keyboardOpen = useKeyboardOpen();
  const { playSound } = useAudio(isMuted);
  useGlassPointer();
  useForegroundNotifications();
  useNotificationNavigation();

  // Stały obiekt kontekstu: nowy przy każdym renderze Layoutu (np. przy
  // przewijaniu, które zmienia `scrolled`) przerenderowywał bieżącą zakładkę.
  const outletContext = useMemo<LayoutContext>(() => ({ playSound }), [playSound]);

  // Dolny pasek jest `position: fixed`, więc na iOS z otwartą klawiaturą
  // potrafi wylądować w połowie ekranu (fixed liczy się od layout viewportu,
  // a nie od widocznego fragmentu). Chowamy go na czas pisania — CSS robi to
  // klasą na <body>, bo pasek jest portalowany poza drzewo Layoutu.
  useEffect(() => {
    document.body.classList.toggle('keyboard-open', keyboardOpen);
    return () => document.body.classList.remove('keyboard-open');
  }, [keyboardOpen]);

  // Przejście między zakładkami nie przeładowuje dokumentu, więc bez tego nowa
  // zakładka otwierała się na tej samej wysokości przewinięcia co poprzednia.
  // `scrollTop` zamiast `scrollTo` nie wywołuje w jsdom „not implemented”, ale
  // globalne `scroll-behavior: smooth` nadal potrafi je animować — dlatego na
  // jedną synchroniczną operację wyłączamy je inline.
  // Zablokuj automatyczne przywracanie przewinięcia przez historię przeglądarki.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // useLayoutEffect resetuje pozycję przewinięcia synchronicznie przed renderem/paintem,
  // co eliminuje asynchroniczny skok scrolla przy pierwszym i kolejnym montowaniu widoku.
  // Wstecz/Dalej w historii przeglądarki (POP) wraca na zapamiętane miejsce
  // zakładki; zwykłe wejście w zakładkę (PUSH) zaczyna od góry.
  const navigationType = useNavigationType();
  const scrollPositions = useRef(new Map<string, number>());
  const scrollPathRef = useRef(location.pathname);

  useEffect(() => {
    const remember = () => {
      scrollPositions.current.set(scrollPathRef.current, document.documentElement.scrollTop);
    };
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    scrollPathRef.current = location.pathname;
    const target = navigationType === NavigationType.Pop ? (scrollPositions.current.get(location.pathname) ?? 0) : 0;
    root.scrollTop = target;
    document.body.scrollTop = 0;
    root.style.scrollBehavior = previousBehavior;
    // `navigationType` celowo poza zależnościami: liczy się tylko zmiana ścieżki.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [showGuide, setShowGuide] = useState(false);
  const [guideReady, setGuideReady] = useState(false);
  const guideExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (guideExitTimer.current !== null) clearTimeout(guideExitTimer.current);
  }, []);

  useEffect(() => {
    if (readStorage(GUIDE_STORAGE_KEY) === '1') { setGuideReady(true); return undefined; }

    // Po pierwszym renderze, żeby nie przykrywać ekranu startowego i nie
    // otwierać dialogu w trakcie animacji wejścia.
    const timer = setTimeout(() => setShowGuide(true), 700);
    return () => clearTimeout(timer);
  }, []);

  const closeGuide = useCallback(() => {
    setShowGuide(false);
    // Poczekaj na animację przewodnika, żeby dwa dialogi nie nachodziły na siebie.
    if (guideExitTimer.current !== null) clearTimeout(guideExitTimer.current);
    guideExitTimer.current = setTimeout(() => setGuideReady(true), 350);
    writeStorage(GUIDE_STORAGE_KEY, '1');
  }, []);

  const { tab: activeTab, announced } = usePageTitle();

  /**
   * Zmiana zakładki nie przeładowuje dokumentu, więc czytnik ekranu nie
   * ogłasza nic nowego — użytkownik zostaje z fokusem na przycisku nawigacji
   * i bez informacji, co się otworzyło. Ten region mówi to raz na nawigację
   * (pierwszy render pomijamy — tytuł dokumentu już nazywa stronę).
   */
  const [routeAnnouncement, setRouteAnnouncement] = useState('');
  const announceAfterMount = useRef(false);
  useEffect(() => {
    if (!announceAfterMount.current) {
      announceAfterMount.current = true;
      return;
    }
    setRouteAnnouncement(announced);
  }, [announced]);

  const [navigation, setNavigation] = useState<{
    tab: string;
    direction: 'forward' | 'backward';
  }>(() => ({
    tab: activeTab,
    direction: 'forward',
  }));
  if (navigation.tab !== activeTab) {
    setNavigation({
      tab: activeTab,
      direction: TAB_ORDER[activeTab] >= TAB_ORDER[navigation.tab] ? 'forward' : 'backward',
    });
  }
  const pageDirection = navigation.tab === activeTab ? navigation.direction : 'forward';

  const switchTab = useCallback((id: string) => {
    playSound(SOUND_TYPES.TAB);
    void navigate(TAB_PATHS[id] ?? '/', { preventScrollReset: true });
  }, [playSound, navigate]);

  return (
    <div
      className="app-shell"
      style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', position: 'relative' }}
    >
      <BootSequence />
      <CyberBackground />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{routeAnnouncement}</p>
      <div className="app-content">
        <Header
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          scrolled={scrolled}
          theme={theme}
          onToggleTheme={toggleTheme}
          onShowGuide={() => setShowGuide(true)}
        />
        <Navigation activeTab={activeTab} setActiveTab={switchTab} />
        {(isOffline || (bootTimedOut && !hasData)) && (
          <OfflineBanner hasData={hasData} onRetry={retry} />
        )}
        <main
          className={`main-content ${pageDirection === 'forward' ? 'page-enter-forward' : 'page-enter-backward'}`}
          key={location.pathname}
        >
          <Outlet context={outletContext} />
        </main>
      </div>
      <PWAInstallBanner />
      <FirstRunGuide open={showGuide} onClose={closeGuide} />
      <AnnualRecapNotice history={history} players={players} enabled={hasData && guideReady && !showGuide} />
    </div>
  );
}

/**
 * Baner braku połączenia.
 *
 * Rozróżnia dwa przypadki, bo mylą się użytkownikom: „mam dane, ale nie zapiszę
 * zmian” to zupełnie inna sytuacja niż „nie mam żadnych danych i patrzę na puste
 * listy”. W drugiej dokładamy przycisk ponowienia, bo interfejs wpuszcza tu po
 * przekroczeniu terminu oczekiwania i bez niego nie byłoby jak spróbować dalej.
 */
function OfflineBanner({ hasData, onRetry }: { hasData: boolean; onRetry: () => void }) {
  return (
    <div
      role="status"
      className="offline-banner"
      style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--co-amber-dim)',
        border: '1px solid var(--co-amber)',
        clipPath: CLIP.smallCard,
      }}
    >
      <TriangleAlert size={18} aria-hidden="true" style={{ color: 'var(--co-amber)', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-display)', letterSpacing: 'normal',
          textTransform: 'none', color: 'var(--co-amber)', fontSize: '0.8125rem',
        }}>
          Brak połączenia
        </p>
        <p style={{
          margin: '2px 0 0', ...FONT.mono(TEXT.tiny),
          color: 'var(--co-dim)', letterSpacing: 'normal', lineHeight: 1.5,
        }}>
          {hasData
            ? 'Pracujesz na ostatnich danych. Zmiany (wpłaty, sesje) nie zapiszą się, dopóki nie wróci sieć.'
            : 'Nie udało się pobrać danych. Apka działa, ale listy będą puste do powrotu sieci.'}
        </p>
      </div>
      {!hasData && (
        <button onClick={onRetry} className="cyber-button-yellow"
          style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          ↻ Ponów
        </button>
      )}
    </div>
  );
}

function CyberBackground() {
  return (
    <div className="fluid-bg" aria-hidden="true">
      <div className="fluid-blob fluid-blob-cyan" style={{ top: '-15%', left: '50%', width: '90vw', height: '70vh', transform: 'translateX(-50%)' }} />
      <div className="fluid-blob fluid-blob-rose" style={{ bottom: '-10%', left: '-5%', width: '55vw', height: '55vh' }} />
      <div className="fluid-blob fluid-blob-green" style={{ top: '40%', right: '-5%', width: '35vw', height: '40vh' }} />
      <div className="fluid-blob fluid-blob-amber" style={{ bottom: '-6%', right: '6%', width: '48vw', height: '46vh' }} />
      <div className="fluid-grid" />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 120% 100% at 50% 38%, transparent 52%, var(--bg-vignette) 100%)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '30vh',
        background: 'linear-gradient(to top, var(--co-tint) 0%, transparent 100%)',
      }} />
    </div>
  );
}
