import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

const STORAGE_KEY = 'push-banner-dismissed';

export default function PushPermissionBanner({ playerNames }) {
  const { permission, isSupported, isRegistering, registerToken } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [status, setStatus] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) setDismissed(true);
    } catch {}
  }, []);

  // Don't show if: not supported, already granted/denied, dismissed
  if (!isSupported) return null;
  if (permission === 'granted' || permission === 'denied') return null;
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const handleEnable = async () => {
    const result = await registerToken(selectedPlayer);
    if (result.success) {
      setStatus('success');
      setTimeout(dismiss, 2000);
    } else {
      setStatus('error');
    }
  };

  return (
    <div style={{
      background: 'var(--co-panel)',
      border: '1px solid rgba(0,229,255,0.3)',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
      padding: '14px 16px',
      marginBottom: 16,
      position: 'relative',
      animation: 'slide-in-up 0.3s ease-out',
    }}>
      {/* Top accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--co-cyan)', opacity: 0.6 }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          padding: '8px', flexShrink: 0,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.25)',
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
        }}>
          <Bell size={16} style={{ color: 'var(--co-cyan)', display: 'block' }} />
        </div>

        <div style={{ flex: 1 }}>
          {status === 'success' ? (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--co-green)', letterSpacing: '0.08em' }}>
              ✓ Powiadomienia włączone!
            </p>
          ) : (
            <>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.08em', color: 'var(--co-text-hi)', margin: '0 0 4px' }}>
                Włącz powiadomienia
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Dostaniesz ping gdy ktoś doda sesję lub zrobi serię 10+
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
                  ⚠ Nie udało się włączyć. Sprawdź ustawienia przeglądarki.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleEnable}
                  disabled={isRegistering}
                  className="cyber-button-yellow"
                  style={{ padding: '8px 16px', fontSize: '0.78rem' }}
                >
                  {isRegistering ? 'Włączanie...' : '⚡ Włącz'}
                </button>
                <button
                  onClick={dismiss}
                  className="cyber-button-outline"
                  style={{ padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Nie teraz
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
