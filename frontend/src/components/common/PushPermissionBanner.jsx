import { useState, useEffect } from 'react';
import { Bell, BellOff, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase/config';

const DISMISS_KEY   = 'push-banner-dismissed';
const PLAYER_KEY    = 'push-registered-player';

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

export default function PushPermissionBanner({ playerNames }) {
  const { permission, isSupported, isRegistering, registerToken } = usePushNotifications();
  const [dismissed,       setDismissed]       = useState(false);
  const [selectedPlayer,  setSelectedPlayer]  = useState('');
  const [status,          setStatus]          = useState(null); // 'success'|'error'|'reregister'|null
  const [errorMsg,        setErrorMsg]        = useState('');
  const [tokenMissing,    setTokenMissing]    = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
      const saved = localStorage.getItem(PLAYER_KEY);
      if (saved) setSelectedPlayer(saved);
    } catch {}
  }, []);

  // Gdy permission jest 'granted' sprawdź czy token jest faktycznie w bazie.
  // Poprzednia wersja kodu mogła go usunąć — wtedy pokażemy opcję ponownej rejestracji.
  useEffect(() => {
    if (permission !== 'granted' || !isSupported) return;
    deviceHasToken().then(has => {
      if (!has) setTokenMissing(true);
    });
  }, [permission, isSupported]);

  if (!isSupported) return null;

  // Baner jest widoczny w trzech sytuacjach:
  // 1. permission === 'default' i nie był zamknięty → normalny onboarding
  // 2. permission === 'granted' ale token zniknął z bazy → re-rejestracja
  // 3. status === 'reregister' → użytkownik sam kliknął "Zarejestruj ponownie"
  const showOnboarding   = permission === 'default' && !dismissed;
  const showReregister   = permission === 'granted' && tokenMissing;
  const showManual       = status === 'reregister';

  if (!showOnboarding && !showReregister && !showManual) return null;

  const dismiss = () => {
    setDismissed(true);
    setTokenMissing(false);
    setStatus(null);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
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
      try { localStorage.setItem(PLAYER_KEY, selectedPlayer); } catch {}
      setTimeout(dismiss, 2500);
    } else {
      setErrorMsg(result.error || 'Nieznany błąd');
      setStatus('error');
    }
  };

  const bannerStyle = {
    background: 'var(--co-panel)',
    border: `1px solid ${showReregister || showManual ? 'rgba(255,160,0,0.4)' : 'rgba(0,229,255,0.3)'}`,
    clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
    padding: '14px 16px',
    marginBottom: 16,
    position: 'relative',
    animation: 'slide-in-up 0.3s ease-out',
  };

  const accentColor = showReregister || showManual ? 'rgba(255,160,0,0.8)' : 'var(--co-cyan)';

  return (
    <div style={bannerStyle}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accentColor, opacity: 0.6 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          padding: '8px', flexShrink: 0,
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}40`,
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
        }}>
          {status === 'success'
            ? <CheckCircle2 size={16} style={{ color: 'var(--co-green)', display: 'block' }} />
            : showReregister
              ? <RefreshCw size={16} style={{ color: 'orange', display: 'block' }} />
              : <Bell size={16} style={{ color: accentColor, display: 'block' }} />
          }
        </div>

        <div style={{ flex: 1 }}>
          {status === 'success' ? (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--co-green)', letterSpacing: '0.08em' }}>
              ✓ Powiadomienia włączone!
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'var(--co-text-hi)', margin: '0 0 4px' }}>
                {showReregister ? '⚠ Rejestracja wygasła — odnów' : 'Włącz powiadomienia'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
                {showReregister
                  ? 'Twój token powiadomień zniknął z bazy. Kliknij "Odnów" żeby ponownie się zarejestrować.'
                  : 'Dostaniesz ping gdy ktoś doda sesję lub gracz zrobi serię 5, 10, 20…'
                }
              </p>

              {/* Player selector */}
              {playerNames && playerNames.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)', letterSpacing: '0.1em', marginBottom: 6 }}>
                    KIM JESTEŚ?
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {playerNames.map(name => (
                      <button
                        key={name}
                        onClick={() => setSelectedPlayer(name)}
                        style={{
                          fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                          letterSpacing: '0.08em', padding: '4px 10px',
                          border: `1px solid ${selectedPlayer === name ? 'var(--co-cyan)' : 'var(--co-border)'}`,
                          color: selectedPlayer === name ? 'var(--co-cyan)' : 'var(--co-dim)',
                          background: selectedPlayer === name ? 'rgba(0,229,255,0.08)' : 'transparent',
                          cursor: 'pointer',
                          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
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
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-yellow)', marginBottom: 8 }}>
                  ⚠ {errorMsg || 'Nie udało się włączyć. Sprawdź ustawienia przeglądarki.'}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleEnable}
                  disabled={isRegistering}
                  className="cyber-button-yellow"
                  style={{ padding: '8px 16px', fontSize: '0.78rem' }}
                >
                  {isRegistering ? 'Rejestruję...' : showReregister ? '🔄 Odnów' : '⚡ Włącz'}
                </button>
                <button
                  onClick={dismiss}
                  className="cyber-button-outline"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  {showReregister ? 'Ignoruj' : 'Nie teraz'}
                </button>
              </div>
            </>
          )}
        </div>

        <button onClick={dismiss} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--co-dim)', padding: 4, flexShrink: 0,
        }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
