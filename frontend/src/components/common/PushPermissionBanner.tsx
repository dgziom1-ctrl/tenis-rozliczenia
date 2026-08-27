import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Bell, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

const DISMISS_KEY   = 'push-banner-dismissed';
const PLAYER_KEY    = 'push-registered-player';
/** Jak długo pokazujemy potwierdzenie, zanim baner sam się schowa. */
const SUCCESS_DISMISS_MS = 2500;

// Sprawdza czy TO urządzenie ma token w bazie.
// Podczas rejestracji zapisujemy hash tokenu w localStorage ('push-token-key').
// Tutaj sprawdzamy czy ten konkretny klucz istnieje w Firebase — bez
// wywoływania getToken() które mogłoby pokazać popup uprawnień.
async function deviceHasToken() {
  try {
    const tokenKey = localStorage.getItem('push-token-key');
    if (!tokenKey) return false;
    const snap = await get(ref(database, `fcmTokens/${tokenKey}`));
    return snap.exists();
  } catch {
    return false;
  }
}

interface PushPermissionBannerProps {
  playerNames?: string[];
}

type BannerStatus = 'success' | 'error' | 'reregister';

export default function PushPermissionBanner({ playerNames }: PushPermissionBannerProps) {
  const { permission, isSupported, isRegistering, registerToken } = usePushNotifications();
  const [dismissed,       setDismissed]       = useState(false);
  const [selectedPlayer,  setSelectedPlayer]  = useState('');
  const [status,          setStatus]          = useState<BannerStatus | null>(null); // 'success'|'error'|'reregister'|null
  const [errorMsg,        setErrorMsg]        = useState('');
  const [tokenMissing,    setTokenMissing]    = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
      const saved = localStorage.getItem(PLAYER_KEY);
      if (saved) setSelectedPlayer(saved);
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  // Gdy permission jest 'granted' sprawdź czy token jest faktycznie w bazie.
  // Poprzednia wersja kodu mogła go usunąć — wtedy pokażemy opcję ponownej rejestracji.
  useEffect(() => {
    if (permission !== 'granted' || !isSupported) return undefined;
    let cancelled = false;
    void deviceHasToken().then(has => {
      if (!cancelled && !has) setTokenMissing(true);
    });
    return () => { cancelled = true; };
  }, [permission, isSupported]);

  // Baner jest widoczny w trzech sytuacjach:
  // 1. permission === 'default' i nie był zamknięty → normalny onboarding
  // 2. permission === 'granted' ale token zniknął z bazy → re-rejestracja
  // 3. status === 'reregister' → użytkownik sam kliknął "Zarejestruj ponownie"
  const showOnboarding   = permission === 'default' && !dismissed;
  // If user ignored/dismissed the banner, don't re-show it after refresh,
  // even if the push token is missing.
  const showReregister   = permission === 'granted' && tokenMissing && !dismissed;
  const showManual       = status === 'reregister';
  const isVisible = isSupported && (showOnboarding || showReregister || showManual);

  // Znacznik na <body>, żeby baner instalacji PWA nie wjechał na ten sam
  // fragment ekranu. Oba są przyklejone do dołu i potrafiły się nałożyć.
  useEffect(() => {
    document.body.classList.toggle('has-push-banner', isVisible);
    return () => document.body.classList.remove('has-push-banner');
  }, [isVisible]);

  if (!isVisible) return null;

  const dismiss = () => {
    setDismissed(true);
    setTokenMissing(false);
    setStatus(null);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* localStorage unavailable */ }
  };

  const handleEnable = async () => {
    if (!selectedPlayer) {
      setErrorMsg('Wybierz najpierw swoje imię');
      setStatus('error');
      return;
    }
    setStatus(null);
    setErrorMsg('');
    const result = await registerToken(selectedPlayer);
    if (result.success) {
      setStatus('success');
      setTokenMissing(false);
      try { localStorage.setItem(PLAYER_KEY, selectedPlayer); } catch { /* localStorage unavailable */ }
      dismissTimer.current = setTimeout(dismiss, SUCCESS_DISMISS_MS);
    } else {
      setErrorMsg(result.error || 'Nieznany błąd');
      setStatus('error');
    }
  };

  // Pozycjonowanie bierze klasa `.bottom-banner`, wspólna z banerem instalacji
  // PWA. Wcześniej oba pliki liczyły odstęp od nawigacji osobno (56 i 72px),
  // a ten miał z-index 38 — czyli poniżej samej nawigacji (40) — i chował się
  // za nią na telefonie.
  const bannerStyle: CSSProperties = {
    left: 0,
    right: 0,
    background: 'var(--co-panel)',
    borderTop: `2px solid ${showReregister || showManual ? 'var(--co-amber)' : 'var(--co-tint-line)'}`,
    padding: '14px 16px 16px',
    animation: 'sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
  };

  // Był tu #FFA000 — trzeci odcień amber w aplikacji, obok --co-amber (#F59E0B)
  // i #FBBF24 z siatki graczy.
  const accentColor = showReregister || showManual ? 'var(--co-amber)' : 'var(--co-cyan)';

  return (
    <div style={bannerStyle} className="push-banner-sheet bottom-banner">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          padding: '8px', flexShrink: 0,
          background: 'var(--co-tint)',
          border: `1px solid ${accentColor}`,
          clipPath: CLIP.badge,
        }}>
          {status === 'success'
            ? <CheckCircle2 size={16} style={{ color: 'var(--co-green)', display: 'block' }} aria-hidden="true" />
            : showReregister
              ? <RefreshCw size={16} style={{ color: accentColor, display: 'block' }} aria-hidden="true" />
              : <Bell size={16} style={{ color: accentColor, display: 'block' }} aria-hidden="true" />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {status === 'success' ? (
            <p role="status" style={{ ...FONT.display(TEXT.base, TRACK.tight), color: 'var(--co-green)', margin: 0 }}>
              ✓ Powiadomienia włączone!
            </p>
          ) : (
            <>
              <p style={{ ...FONT.display(TEXT.base, TRACK.tight), color: 'var(--co-text-hi)', margin: '0 0 4px' }}>
                {showReregister ? '⚠ Rejestracja wygasła — odnów' : 'Włącz powiadomienia'}
              </p>
              {/* Cały opis banera miał 0.6rem, czyli 9,6px. */}
              <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', margin: '0 0 10px', lineHeight: 1.5 }}>
                {showReregister
                  ? 'Twój token powiadomień zniknął z bazy. Kliknij „Odnów", żeby zarejestrować się ponownie.'
                  : 'Dostaniesz ping, gdy ktoś doda sesję lub gracz zrobi serię 5, 10, 20…'
                }
              </p>

              {/* Player selector */}
              {playerNames && playerNames.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ ...FONT.monoLabel, marginBottom: 6 }}>
                    KIM JESTEŚ?
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {playerNames.map(name => (
                      <button
                        key={name}
                        onClick={() => setSelectedPlayer(name)}
                        aria-pressed={selectedPlayer === name}
                        style={{
                          ...FONT.display(TEXT.small, TRACK.tight),
                          minHeight: 44, padding: '4px 12px',
                          border: `1px solid ${selectedPlayer === name ? 'var(--co-cyan)' : 'var(--co-border)'}`,
                          color: selectedPlayer === name ? 'var(--co-cyan)' : 'var(--co-text)',
                          background: selectedPlayer === name ? 'var(--co-tint-hi)' : 'transparent',
                          cursor: 'pointer',
                          clipPath: CLIP.badge,
                          transition: 'all 0.15s',
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {status === 'error' && (
                <p role="alert" style={{ ...FONT.mono(TEXT.small), color: 'var(--co-rose)', marginBottom: 8 }}>
                  ⚠ {errorMsg || 'Nie udało się włączyć. Sprawdź ustawienia przeglądarki.'}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => void handleEnable()}
                  disabled={isRegistering}
                  className="cyber-button-yellow"
                  style={{ minHeight: 44, padding: '10px 16px' }}
                >
                  {isRegistering ? 'Rejestruję…' : showReregister ? '🔄 Odnów' : '⚡ Włącz'}
                </button>
                <button
                  onClick={dismiss}
                  className="cyber-button-outline"
                  style={{ minHeight: 44, padding: '10px 14px' }}
                >
                  {showReregister ? 'Ignoruj' : 'Nie teraz'}
                </button>
              </div>
            </>
          )}
        </div>

        <button onClick={dismiss} aria-label="Zamknij" className="icon-btn" style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--co-dim)', width: 44, height: 44, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: -8, marginRight: -8,
        }}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
