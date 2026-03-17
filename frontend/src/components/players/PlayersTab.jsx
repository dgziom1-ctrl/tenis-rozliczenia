import { useState, useCallback } from 'react';
import { getPlayerColor } from '../../constants/playerColors';
import { Users, UserPlus, Cpu, Trash2, RotateCcw, AlertTriangle, Lock, Check, X, Zap, Shield } from 'lucide-react';
import { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti } from '../../firebase/index';
import { ADMIN_PASSWORD, SOUND_TYPES, ORGANIZER_NAME } from '../../constants';
import { useToast } from '../common/Toast';
import { useThemeTokens } from '../../context/ThemeContext';

// Colors from shared getPlayerColor — same as dashboard

function SectionHeader({ icon: Icon, title, accent = 'var(--co-cyan)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--co-border)' }}>
      <div style={{ padding: '6px 8px', background: `rgba(0,0,0,0.6)`, border: `1px solid ${accent}25`, clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
        <Icon size={13} style={{ color: accent, display: 'block' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${accent}20, transparent)` }} />
    </div>
  );
}

function PasswordModal({ playerName, onConfirm, onCancel, tokens }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) { onConfirm(); }
    else { setError(true); setInput(''); setTimeout(() => setError(false), 1500); }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(4px)' }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{
        background: '#0a0a0f',
        border: `1px solid ${error ? 'var(--co-yellow)' : 'rgba(0,229,255,0.35)'}`,
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        padding: 24, width: '100%', maxWidth: 360,
        boxShadow: error ? '0 0 30px rgba(255,229,0,0.25)' : '0 0 30px rgba(0,229,255,0.12)',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Lock size={16} style={{ color: 'var(--co-cyan)', flexShrink: 0 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.15em', color: 'var(--co-cyan)', margin: 0, textTransform: 'uppercase' }}>
            Podaj hasło admina
          </h3>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-dim)', marginBottom: 16 }}>
          {'>'} Usuń gracza: <span style={{ color: '#e8e8e8' }}>{playerName}</span>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="password" value={input} onChange={e => setInput(e.target.value)}
            placeholder="// ACCESS CODE..."
            autoFocus
            className="cyber-input"
            style={{
              width: '100%', padding: '10px 12px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
              border: `1px solid ${error ? 'var(--co-yellow)' : '#2a2a2a'}`,
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              boxShadow: error ? '0 0 10px rgba(255,229,0,0.3)' : 'none',
            }}
          />
          {error && <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: 'var(--co-yellow)', textAlign: 'center' }}>⚠ ❌ Złe hasło</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="cyber-button-yellow" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={14} /> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel} className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} /> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Player card ────────────────────────────────────────────
function PlayerProfileCard({ player, index, onDelete, isOrganizer }) {
  const c = getPlayerColor(player.name);
  const initials = player.name.slice(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      background: 'var(--co-dark)', border: `1px solid ${isOrganizer ? 'rgba(0,229,255,0.3)' : c.border + '35'}`,
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
      transition: 'border-color 0.2s',
      boxShadow: `inset 0 0 10px ${isOrganizer ? 'rgba(0,229,255,0.03)' : c.border + '08'}`,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = isOrganizer ? 'rgba(0,229,255,0.5)' : c.border + '60'}
      onMouseLeave={e => e.currentTarget.style.borderColor = isOrganizer ? 'rgba(0,229,255,0.3)' : c.border + '35'}
    >
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: c.bg, border: `1px solid ${c.border}55`,
        boxShadow: `0 0 8px ${c.border}30`,
        borderRadius: isOrganizer ? '50%' : '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        clipPath: isOrganizer ? 'none' : 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
      }}>
        {isOrganizer
          ? <Shield size={16} style={{ color: 'var(--co-cyan)' }} />
          : <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: c.text }}>{initials}</span>}
      </div>

      {/* Name + class */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#d0d0d0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name}
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.15em', color: isOrganizer ? 'var(--co-cyan)' : c.border, opacity: 0.7, margin: '2px 0 0', textTransform: 'uppercase' }}>
          {isOrganizer ? '🏓 Organizator' : '🏓 Gracz'}
        </p>
      </div>

      {/* Action */}
      {!isOrganizer ? (
        <button onClick={() => onDelete(player.name)} style={{
          padding: '7px 10px', background: 'transparent',
          border: '1px solid #2a2a2a', cursor: 'pointer',
          color: 'var(--co-dim)',
          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,229,0,0.5)'; e.currentTarget.style.color = 'var(--co-yellow)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = 'var(--co-dim)'; }}
          title="Usuń gracza"
        >
          <Trash2 size={14} />
        </button>
      ) : (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.12em', color: 'var(--co-dim)', padding: '4px 8px', border: '1px solid var(--co-border)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
          HQ
        </span>
      )}
    </div>
  );
}

export default function PlayersTab({ players, deletedPlayers, defaultMultiPlayers, playSound }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [savingMulti,   setSavingMulti]   = useState(false);
  const [localMulti,    setLocalMulti]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pwModal,       setPwModal]       = useState(null);
  const { showSuccess, showError } = useToast();
  const tokens = useThemeTokens();

  const currentMulti = localMulti ?? (defaultMultiPlayers || []);

  const toggleDefaultMulti = async (name) => {
    const next = currentMulti.includes(name) ? currentMulti.filter(p => p !== name) : [...currentMulti, name];
    setLocalMulti(next);
    setSavingMulti(true);
    const result = await saveDefaultMulti(next);
    setSavingMulti(false);
    if (!result.success) { showError('Nie udało się zapisać'); setLocalMulti(currentMulti); }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const result = await addPlayer(newPlayerName.trim());
    if (!result.success) { showError(result.error || 'Nie udało się dodać gracza'); return; }
    playSound(SOUND_TYPES.SUCCESS);
    showSuccess(`✓ Dodano: ${newPlayerName.trim()}`);
    setNewPlayerName('');
  };

  const handleSoftDelete = async (playerName) => {
    const result = await softDeletePlayer(playerName);
    if (!result.success) { showError(result.error || 'Nie udało się usunąć gracza'); return; }
    playSound(SOUND_TYPES.DELETE);
    showSuccess(`Gracz ${playerName} przeniesiony do kosza`);
    setPwModal(null);
  };

  const handleRestore = async (playerName) => {
    const result = await restorePlayer(playerName);
    if (!result.success) { showError(result.error || 'Nie udało się przywrócić gracza'); return; }
    playSound(SOUND_TYPES.SUCCESS);
    showSuccess(`✓ Przywrócono: ${playerName}`);
  };

  const handlePermanentDelete = async (playerName) => {
    const result = await permanentDeletePlayer(playerName);
    if (!result.success) { showError(result.error || 'Nie udało się trwale usunąć'); return; }
    playSound(SOUND_TYPES.DELETE);
    setConfirmDelete(null);
  };

  return (
    <>
      {pwModal && (
        <PasswordModal playerName={pwModal} onConfirm={() => handleSoftDelete(pwModal)} onCancel={() => setPwModal(null)} tokens={tokens} />
      )}

      <div className="cyber-box" style={{
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
        padding: '20px', maxWidth: 680, margin: '0 auto',
        animation: 'slide-in-up 0.3s ease-out',
      }}>
        {/* Main header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid var(--co-border)' }}>
          <div style={{ padding: '7px 9px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.2)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <Users size={16} style={{ color: 'var(--co-cyan)', display: 'block' }} />
          </div>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--co-cyan)' }}>
              Gracze
            </span>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', margin: '2px 0 0' }}>
              {'>'} zarządzaj składem
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#3a3a3a' }}>
            [{players?.length || 0} graczy]
          </span>
        </div>

        {/* Add player form */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={UserPlus} title="Dodaj nowego gracza" />
          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Imię gracza..."
              className="cyber-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
              required
            />
            <button type="submit" className="cyber-button-yellow" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.62rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <UserPlus size={14} /> DODAJ
            </button>
          </form>
        </div>

        {/* Player list */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Cpu} title="Aktywni gracze" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {players.map((p, i) => (
                <PlayerProfileCard key={p.name} player={p} index={i} onDelete={setPwModal} isOrganizer={p.name === ORGANIZER_NAME} />
              ))}
            </div>
          </div>
        )}

        {/* Multisport defaults */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Zap} title="Multisport domyślny" accent="var(--co-green)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', marginBottom: 12 }}>
              {'>'} Zaznaczeni będą automatycznie oznaczeni jako Multisport przy każdej nowej sesji.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {players.map(p => {
                const active = currentMulti.includes(p.name);
                return (
                  <button key={p.name} onClick={() => toggleDefaultMulti(p.name)} disabled={savingMulti}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: 'var(--font-display)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
                      ...(active ? {
                        background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.4)', color: 'var(--co-green)',
                        boxShadow: '0 0 8px rgba(0,229,255,0.1)',
                      } : {
                        background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: '#444',
                      }),
                    }}>
                    <Zap size={12} style={{ color: active ? 'var(--co-green)' : '#333', flexShrink: 0 }} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trash / deleted */}
        {deletedPlayers?.length > 0 && (
          <div>
            <SectionHeader icon={Trash2} title="Kosz" accent="var(--co-yellow)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {deletedPlayers.map(name => (
                <div key={name}>
                  {confirmDelete === name ? (
                    <div style={{
                      padding: '14px', background: 'rgba(255,229,0,0.04)', border: '1px solid rgba(255,229,0,0.3)',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                    }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.12em', color: 'var(--co-yellow)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5, textTransform: 'uppercase' }}>
                        <AlertTriangle size={12} /> USUNĄĆ NA ZAWSZE?
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)', marginBottom: 12 }}>{name}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handlePermanentDelete(name)} style={{
                          flex: 1, padding: '8px', background: 'var(--co-yellow)', color: '#000', border: 'none', cursor: 'pointer',
                          fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', fontWeight: 700,
                          clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                        }}>
                          POTWIERDŹ
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className="cyber-button-outline" style={{ flex: 1, padding: '8px' }}>
                          ANULUJ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)',
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                    }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: '#3a3a3a', display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        <Cpu size={13} style={{ opacity: 0.3 }} /> {name}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleRestore(name)} style={{
                          padding: '6px 8px', background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                          color: '#3a3a3a', transition: 'all 0.15s',
                          clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; e.currentTarget.style.color = 'var(--co-green)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#3a3a3a'; }}
                          title="Przywróć">
                          <RotateCcw size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(name)} style={{
                          padding: '6px 8px', background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                          color: '#3a3a3a', transition: 'all 0.15s',
                          clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,229,0,0.4)'; e.currentTarget.style.color = 'var(--co-yellow)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e1e'; e.currentTarget.style.color = '#3a3a3a'; }}
                          title="Usuń na zawsze">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
