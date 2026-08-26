import { useState, useMemo, useCallback } from 'react';
import { addPayment, removePayment } from '@/lib/firebase';
import { SOUND_TYPES, ORGANIZER_NAME, RANKS } from '@/constants';
import { buildDebtDisplayData } from '@/utils/debt';
import { useToast } from '../common/Toast';
import PlayerCard from './PlayerCard';
import { Zap, ChevronDown } from 'lucide-react';
import PushPermissionBanner from '../common/PushPermissionBanner';
import type { UIData, HistoryEntry, PlayerStats, SoundType } from '@/types/ui';
import { CLIP } from '@/constants/styles';

interface DashboardTabProps {
  data: Pick<UIData, 'summary' | 'players' | 'payments'>;
  history: HistoryEntry[];
  playSound: (type: SoundType) => void;
}

export default function DashboardTab({ data, history, playSound }: DashboardTabProps) {
  const [openDetails,   setOpenDetails]   = useState<string | null>(null);
  const [pinnedPlayer,  setPinnedPlayer]  = useState<string | null>(null);
  const [showRankGuide, setShowRankGuide] = useState(false);

  const { showError } = useToast();

  const totalWeeks = data.summary?.totalWeeks ?? 0;

  const handleAddPayment = useCallback(async (playerName: string, amount: number, paymentId: string) => {
    playSound(SOUND_TYPES.COIN);
    const result = await addPayment(playerName, amount, paymentId);
    if (!result.success) showError(result.error || 'Nie udało się zapisać wpłaty');
    return result;
  }, [playSound, showError]);

  const handleRemovePayment = useCallback(async (playerName: string, paymentId: string) => {
    playSound(SOUND_TYPES.CLICK);
    const result = await removePayment(playerName, paymentId);
    if (!result.success) showError(result.error || 'Nie udało się cofnąć wpłaty');
    return result;
  }, [playSound, showError]);

  const toggleDetails = useCallback((playerName: string) => {
    playSound(SOUND_TYPES.CLICK);
    setOpenDetails(prev => (prev === playerName ? null : playerName));
  }, [playSound]);

  const getBreakdown = useCallback(
    (player: PlayerStats) => buildDebtDisplayData(player, history, data.payments),
    [history, data.payments],
  );

  const sortedPlayers = useMemo(() => {
    if (!data.players) return [];
    // Sort: alphabetical A→Z, organizer always last, but pinned card (undo) to the top.
    const nonOrg = data.players.filter(p => p.name !== ORGANIZER_NAME);
    const organizer = data.players.filter(p => p.name === ORGANIZER_NAME);
    const alphaSorted = [...nonOrg].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    if (pinnedPlayer && pinnedPlayer !== ORGANIZER_NAME) {
      const pinned = alphaSorted.find(p => p.name === pinnedPlayer);
      if (pinned) {
        return [pinned, ...alphaSorted.filter(p => p.name !== pinnedPlayer), ...organizer];
      }
    }
    return [...alphaSorted, ...organizer];
  }, [data.players, pinnedPlayer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Push notifications banner */}
      <PushPermissionBanner playerNames={sortedPlayers.map(p => p.name)} />

      {/* Empty state */}
      {totalWeeks === 0 && (
        <div style={{
          background: 'var(--co-panel)',
          border: '1px solid var(--co-border)',
          borderLeft: '3px solid var(--co-cyan)',
          clipPath: CLIP.smallCard,
          padding: '40px 32px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ambient scan line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--co-cyan), transparent)',
            animation: 'podium-scan 3s ease-in-out infinite',
          }} />
          <div style={{ fontSize: '2.5rem', marginBottom: 16, filter: 'drop-shadow(0 0 8px var(--co-cyan))' }}>🏓</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', marginBottom: 10 }}>
            BRAK ROZGRYWEK
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)', lineHeight: 1.7 }}>
            {'>'} System gotowy.<br/>
            {'>'} Dodaj pierwszą sesję w zakładce{' '}
            <span style={{ color: 'var(--co-cyan)', borderBottom: '1px solid var(--co-tint-line)' }}>DODAJ</span>
            <span className="terminal-cursor" />
          </p>
        </div>
      )}

      {/* Session count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: -4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '2px 10px',
          background: 'var(--co-tint)',
          border: '1px solid var(--co-tint-hi)',
          clipPath: CLIP.badge,
        }}>
          <Zap size={9} style={{ color: 'var(--co-cyan)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>
            sesji: <span style={{ color: 'var(--co-cyan)' }}>{totalWeeks}</span>
          </span>
        </div>
      </div>

      {/* Player cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(265px, 1fr))',
        gap: 14,
      }}>
        {sortedPlayers.map((player, idx) => {
          const showBreakdown = openDetails === player.name;
          const stagger = `card-stagger-${Math.min(idx + 1, 6)}`;
          const isOrg = player.name === ORGANIZER_NAME;
          return (
            <div key={player.name} className={`player-card-wrap ${stagger}`}>
              <PlayerCard
                player={player}
                totalWeeks={totalWeeks}
                history={history}
                openDetails={showBreakdown}
                onToggleDetails={toggleDetails}
                breakdown={(!isOrg && showBreakdown) ? getBreakdown(player) : null}
                onAddPayment={handleAddPayment}
                onRemovePayment={handleRemovePayment}
                onPin={setPinnedPlayer}
                onUnpin={() => setPinnedPlayer(null)}
                playerIndex={idx}
                allPlayers={isOrg ? data.players : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* ── Collapsible rank guide — only show when there's data ── */}
      {totalWeeks > 0 && (
        <div style={{ background: 'var(--co-panel)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard }}>
          <button
            onClick={() => setShowRankGuide(v => !v)}
            style={{
              width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.18em' }}>
              {RANKS.map(r => r.emoji).join(' ')}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-dim)', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
              Co oznaczają rangi?
            </span>
            <ChevronDown size={13} style={{ color: 'var(--co-dim)', transform: showRankGuide ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {showRankGuide && (
            <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, borderTop: '1px solid var(--co-border)' }}>
              {RANKS.map((r, i) => (
                <div key={r.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: `${r.hex}06`, border: `1px solid ${r.hex}20`,
                  clipPath: CLIP.badge,
                  marginTop: 6,
                }}>
                  <span aria-hidden="true" style={{ fontSize: '1.25rem', flexShrink: 0 }}>{r.emoji}</span>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: r.hex, margin: 0, letterSpacing: '0.1em' }}>{r.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: 0 }}>
                      {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
