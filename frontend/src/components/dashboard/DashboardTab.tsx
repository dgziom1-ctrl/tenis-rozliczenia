import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { addPayment, removePayment } from '@/lib/firebase';
import { SOUND_TYPES, ORGANIZER_NAME, RANKS, rankTint } from '@/constants';
import { buildDebtDisplayData } from '@/utils/debt';
import { calculateSeasonCardStats } from '@/utils/rankings';
import { buildPlayerCardMeta } from '@/utils/playerCard';
import { getCurrentSeason, filterHistoryByYear } from '@/utils/sessions';
import { useToast } from '../common/Toast';
import PlayerCard from './PlayerCard';
import { Zap, ChevronDown } from 'lucide-react';
import PushPermissionBanner from '../common/PushPermissionBanner';
import type { UIData, HistoryEntry, PlayerStats, SoundType } from '@/types/ui';
import { CLIP } from '@/constants/styles';
import BrandMark from '../common/BrandMark';
import RankGlyph from '../common/icons/RankGlyph';

interface DashboardTabProps {
  data: Pick<UIData, 'summary' | 'players' | 'payments'>;
  history: HistoryEntry[];
  playSound: (type: SoundType) => void;
}

export default function DashboardTab({ data, history, playSound }: DashboardTabProps) {
  const [openDetails,   setOpenDetails]   = useState<string | null>(null);
  const [showRankGuide, setShowRankGuide] = useState(false);

  const { showError } = useToast();
  const navigate = useNavigate();

  const totalWeeks = data.summary?.totalWeeks ?? 0;

  // Dashboard to „tu i teraz": bez przełącznika sezonów, zawsze bieżący sezon.
  // Ten sam próg co w rozliczeniach (bilans otwarcia) — sezon zaczyna się
  // pierwszą sesją nowego roku, a nie 1 stycznia na zegarku.
  const currentSeason = useMemo(() => getCurrentSeason(history), [history]);
  const seasonHistory = useMemo(
    () => filterHistoryByYear(history, currentSeason),
    [history, currentSeason],
  );

  // Nowy sezon, czysta karta: OVR, obecność, sporty, odznaki, ranga i seria
  // liczą się tylko z sesji rozegranych w bieżącym sezonie. Gracz, który w
  // tym sezonie jeszcze nie grał, dostaje zera (ranga DUCH), a nie dorobek
  // z poprzednich lat — saldo i tak zostaje ciągłe, bo pieniądze nie zerują
  // się razem z sezonem.
  const cardMeta = useMemo(() => {
    const stats = calculateSeasonCardStats(data.players ?? [], seasonHistory);
    return new Map(stats.map(p => [p.name, buildPlayerCardMeta(p, seasonHistory)]));
  }, [data.players, seasonHistory]);

  const handleAddPayment = useCallback(async (playerName: string, amount: number, paymentId: string) => {
    const result = await addPayment(playerName, amount, paymentId);
    if (result.success) playSound(SOUND_TYPES.COIN);
    else {
      playSound(SOUND_TYPES.ERROR);
      showError(result.error || 'Nie udało się zapisać wpłaty');
    }
    return result;
  }, [playSound, showError]);

  const handleRemovePayment = useCallback(async (playerName: string, paymentId: string) => {
    const result = await removePayment(playerName, paymentId);
    // Dźwięk przy cofnięciu płatności jest denerwujący — pomijamy go.
    // Błąd nadal sygnalizujemy.
    if (!result.success) {
      playSound(SOUND_TYPES.ERROR);
      showError(result.error || 'Nie udało się cofnąć wpłaty');
    }
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
    // Sort: alphabetical A→Z, organizer always last. Karta nie przeskakuje na
    // górę po wpłacie — wcześniej pinowanie przenosiło ją w trakcie animacji
    // licznika i wyglądało jak skok do zera.
    const nonOrg = data.players.filter(p => p.name !== ORGANIZER_NAME);
    const organizer = data.players.filter(p => p.name === ORGANIZER_NAME);
    const alphaSorted = [...nonOrg].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    return [...alphaSorted, ...organizer];
  }, [data.players]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Push notifications banner */}
      <PushPermissionBanner playerNames={sortedPlayers.map(p => p.name)} />

      {/* Empty state */}
      {totalWeeks === 0 && (
        <div className="glass-panel" style={{
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
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, filter: 'var(--glow-drop-cyan)' }}>
            <BrandMark size={64} />
          </div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', marginBottom: 10 }}>
            BRAK ROZGRYWEK
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--co-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            {'>'} System gotowy.<br/>
            {'>'} {sortedPlayers.length === 0
              ? 'Najpierw dodaj graczy, potem pierwszą sesję.'
              : 'Dodaj pierwszą sesję — reszta policzy się sama.'}
          </p>
          {/* Pusty stan musi mieć akcję, nie tylko wskazówkę: wcześniej
              trzeba było samemu znaleźć zakładkę DODAJ w nawigacji. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="cyber-button-yellow"
              onClick={() => navigate('/admin')}
              style={{ minHeight: 44, padding: '11px 18px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Zap size={15} aria-hidden="true" /> Dodaj pierwszą sesję
            </button>
            {sortedPlayers.length === 0 && (
              <button
                type="button"
                className="cyber-button-outline"
                onClick={() => navigate('/players')}
                style={{ minHeight: 44, padding: '11px 18px' }}
              >
                Dodaj graczy
              </button>
            )}
          </div>
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
          <Zap size={9} aria-hidden="true" style={{ color: 'var(--co-cyan)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>
            sesji: <span style={{ color: 'var(--co-cyan)' }}>{seasonHistory.length}</span>
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
                history={seasonHistory}
                meta={cardMeta.get(player.name) ?? buildPlayerCardMeta({
                  ...player,
                  attendanceCount: 0,
                  eligibleWeeks: 0,
                  attendancePercentage: 0,
                  currentStreak: 0,
                }, seasonHistory)}
                openDetails={showBreakdown}
                onToggleDetails={toggleDetails}
                breakdown={(!isOrg && showBreakdown) ? getBreakdown(player) : null}
                onAddPayment={handleAddPayment}
                onRemovePayment={handleRemovePayment}
                playSound={playSound}
                playerIndex={idx}
                allPlayers={isOrg ? data.players : undefined}
              />
            </div>
          );
        })}
      </div>

      {/* ── Collapsible rank guide — only show when there's data ── */}
      {totalWeeks > 0 && (
        <div className="glass-panel" style={{ clipPath: CLIP.smallCard }}>
          <button
            type="button"
            onClick={() => setShowRankGuide(v => !v)}
            aria-expanded={showRankGuide}
            aria-controls="rank-guide-panel"
            style={{
              width: '100%', minHeight: 44, padding: '10px 16px',
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            }}
          >
            <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {RANKS.map(r => <RankGlyph key={r.name} rank={r} size={13} />)}
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-dim)', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>
              Co oznaczają rangi?
            </span>
            <ChevronDown size={13} aria-hidden="true" style={{ color: 'var(--co-dim)', transform: showRankGuide ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
          {/* Panel zostaje w DOM także po złożeniu: `aria-controls` zawsze
              wskazuje na istniejący element, a czytnik wie, że jest ukryty. */}
          <div
            id="rank-guide-panel"
            hidden={!showRankGuide}
            style={{ padding: '0 16px 16px', display: showRankGuide ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, borderTop: '1px solid var(--co-border)' }}
          >
              {RANKS.map((r, i) => (
                <div key={r.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  background: rankTint(r, 2), border: `1px solid ${rankTint(r, 13)}`,
                  clipPath: CLIP.badge,
                  marginTop: 6,
                }}>
                  <RankGlyph rank={r} size={18} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', color: r.hex, margin: 0, letterSpacing: '0.1em' }}>{r.name}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', margin: 0 }}>
                      {i === RANKS.length - 1 ? '<20%' : `${r.min}%+`}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
