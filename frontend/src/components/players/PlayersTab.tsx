import { useState, useId } from 'react';
import type { FormEvent } from 'react';
import type { PlayerStats, SoundType } from '@/types/ui';
import { Users, UserPlus, Cpu, Trash2, RotateCcw, AlertTriangle, Zap } from 'lucide-react';
import PlayerProfileCard from './PlayerProfileCard';
import { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, saveDefaultMulti } from '@/lib/firebase';
import { SOUND_TYPES, ORGANIZER_NAME } from '@/constants';
import { FONT, TEXT, TRACK, CLIP, CONTENT_WIDTH } from '@/constants/styles';
import { useToast } from '../common/Toast';
import { PasswordModal, SectionHeader, PanelHeader } from '../common/SharedUI';
import { InlineSpinner } from '../common/LoadingSkeleton';

interface PlayersTabProps {
  players: PlayerStats[];
  deletedPlayers: string[];
  defaultMultiPlayers: string[];
  playSound: (type: SoundType) => void;
}

export default function PlayersTab({ players, deletedPlayers, defaultMultiPlayers, playSound }: PlayersTabProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [savingMulti,   setSavingMulti]   = useState(false);
  const [localMulti,    setLocalMulti]    = useState<string[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pwModal,       setPwModal]       = useState<string | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [processingPlayer, setProcessingPlayer] = useState<string | null>(null);
  const newPlayerId = useId();
  const { showSuccess, showError } = useToast();

  const currentMulti = localMulti ?? (defaultMultiPlayers || []);

  const toggleDefaultMulti = async (name: string) => {
    const previous = currentMulti;
    const next = previous.includes(name) ? previous.filter(p => p !== name) : [...previous, name];
    setLocalMulti(next);
    setSavingMulti(true);
    try {
      const result = await saveDefaultMulti(next);
      if (!result.success) { showError(result.error || 'Nie udało się zapisać'); setLocalMulti(previous); }
    } catch {
      // Bez tego wyjątek zostawiał `savingMulti` na true i blokował całą listę.
      showError('Nie udało się zapisać');
      setLocalMulti(previous);
    } finally {
      setSavingMulti(false);
    }
  };

  const handleAddPlayer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    if (isAddingPlayer) return;
    setIsAddingPlayer(true);
    try {
      const result = await addPlayer(newPlayerName.trim());
      if (!result.success) { showError(result.error || 'Nie udało się dodać gracza'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess(`✓ Dodano: ${newPlayerName.trim()}`);
      setNewPlayerName('');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleSoftDelete = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await softDeletePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się usunąć gracza'); return; }
      playSound(SOUND_TYPES.DELETE);
      showSuccess(`Gracz ${playerName} przeniesiony do kosza`);
      setPwModal(null);
    } finally {
      setProcessingPlayer(null);
    }
  };

  const handleRestore = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await restorePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się przywrócić gracza'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess(`✓ Przywrócono: ${playerName}`);
    } finally {
      setProcessingPlayer(null);
    }
  };

  const handlePermanentDelete = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await permanentDeletePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się trwale usunąć'); return; }
      playSound(SOUND_TYPES.DELETE);
      setConfirmDelete(null);
    } finally {
      setProcessingPlayer(null);
    }
  };

  return (
    <>
      {pwModal && (
        <PasswordModal action={`Usuń gracza: ${pwModal}`} onConfirm={() => void handleSoftDelete(pwModal)} onCancel={() => setPwModal(null)} playSound={playSound} />
      )}

      <div className="cyber-box" style={{
        clipPath: CLIP.panel,
        padding: '20px', maxWidth: CONTENT_WIDTH.form, margin: '0 auto',
        animation: 'slide-in-up 0.3s ease-out',
      }}>
        <PanelHeader icon={Users} title="Gracze" sub={`> zarządzaj składem · ${players?.length || 0} graczy`} />

        {/* Add player form */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={UserPlus} title="Dodaj nowego gracza" />
          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: 8 }}>
            <label htmlFor={newPlayerId} className="sr-only">Imię nowego gracza</label>
            <input id={newPlayerId} type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Imię gracza..."
              className="cyber-input"
              style={{ flex: 1, padding: '10px 14px', clipPath: CLIP.tag }}
              required
              disabled={isAddingPlayer}
            />
            <button
              type="submit"
              disabled={isAddingPlayer}
              className="cyber-button-yellow"
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0, opacity: isAddingPlayer ? 0.7 : 1, cursor: isAddingPlayer ? 'not-allowed' : 'pointer' }}
            >
              {isAddingPlayer ? <InlineSpinner size="sm" /> : <UserPlus size={14} />} {isAddingPlayer ? 'DODAJĘ...' : 'DODAJ'}
            </button>
          </form>
        </div>

        {/* Player list */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Cpu} title="AKTYWNI GRACZE" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {[...players]
                .sort((a, b) => {
                  if (a.name === ORGANIZER_NAME) return 1;
                  if (b.name === ORGANIZER_NAME) return -1;
                  return a.name.localeCompare(b.name, 'pl');
                })
                .map((p, i) => (
                  <PlayerProfileCard
                    key={p.name}
                    player={p}
                    index={i}
                    onDelete={setPwModal}
                    isOrganizer={p.name === ORGANIZER_NAME}
                    disabled={processingPlayer === p.name}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Multisport defaults */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Zap} title="Multisport domyślny" accent="var(--co-green)" />
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-text)', marginBottom: 12 }}>
              {'>'} Zaznaczeni będą automatycznie oznaczeni jako Multisport przy każdej nowej sesji.
            </p>
            <div className="player-grid">
              {players.map(p => {
                const active = currentMulti.includes(p.name);
                return (
                  <button key={p.name} onClick={() => void toggleDefaultMulti(p.name)} disabled={savingMulti}
                    aria-pressed={active}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                      clipPath: CLIP.badge,
                      ...(active ? {
                        background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)', color: 'var(--co-green)',
                        boxShadow: 'var(--glow-box-cyan)',
                      } : {
                        background: 'var(--co-dark)', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
                      }),
                    }}>
                    <Zap size={12} style={{ color: active ? 'var(--co-green)' : 'var(--co-dim)', flexShrink: 0 }} aria-hidden="true" />
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
            <SectionHeader icon={Trash2} title="Kosz" accent="var(--co-rose)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {deletedPlayers.map(name => (
                <div key={name}>
                  {confirmDelete === name ? (
                    <div style={{
                      padding: '14px', background: 'var(--co-tint-rose)', border: '1px solid var(--co-rose)',
                      clipPath: CLIP.smallCard,
                    }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', color: 'var(--co-rose)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                        <AlertTriangle size={12} /> USUNĄĆ NA ZAWSZE?
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-text)', marginBottom: 12 }}>{name}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* `disabled`, nie samo pointerEvents — inaczej Enter na
                            zafokusowanym przycisku i tak wysyłał drugie żądanie. */}
                        <button onClick={() => void handlePermanentDelete(name)} disabled={processingPlayer === name}
                          className="cyber-button-danger"
                          style={{ flex: 1, minHeight: 44, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {processingPlayer === name ? <InlineSpinner size="sm" /> : 'POTWIERDŹ'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} disabled={processingPlayer === name} className="cyber-button-outline" style={{ flex: 1, minHeight: 44, padding: '10px' }}>
                          ANULUJ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)',
                      clipPath: CLIP.smallCard,
                    }}>
                      {/* `--co-close-btn` to token przycisku zamknięcia, nie koloru
                          treści — w ciemnym motywie miał ~2:1 na nazwie gracza. */}
                      <span style={{ ...FONT.display(TEXT.base, TRACK.tight), color: 'var(--co-text)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <Cpu size={14} style={{ color: 'var(--co-dim)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      </span>
                      {/* Dwa cele ~25×29px stały 6px od siebie, a jeden z nich
                          usuwa gracza bezpowrotnie. Teraz 44px i 10px odstępu. */}
                      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        <button onClick={() => void handleRestore(name)} disabled={processingPlayer === name}
                          className="icon-btn"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44,
                            background: 'transparent', border: '1px solid var(--co-border)',
                            cursor: processingPlayer === name ? 'not-allowed' : 'pointer',
                            color: 'var(--co-dim)',
                            clipPath: CLIP.badge,
                            opacity: processingPlayer === name ? 0.65 : 1,
                          }}
                          title="Przywróć" aria-label={`Przywróć gracza ${name}`}>
                          <RotateCcw size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmDelete(name)}
                          className="icon-btn danger"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44,
                            background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                            color: 'var(--co-dim)',
                            clipPath: CLIP.badge,
                          }}
                          title="Usuń na zawsze" aria-label={`Usuń gracza ${name} na zawsze`}>
                          <Trash2 size={16} aria-hidden="true" />
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
