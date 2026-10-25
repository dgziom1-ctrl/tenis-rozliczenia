import { useMemo, useState, useId } from 'react';
import { X } from 'lucide-react';
import { RANKS, getRank, rankTint } from '@/constants';
import RankGlyph from '../common/icons/RankGlyph';
import { FONT, TEXT, TRACK, CLIP } from '../../constants/styles';
import { formatDate } from '@/utils/format';
import { getPlayerColor } from '@/constants/colors';
import { getPlayerAchievements } from '@/utils/achievements';
import { filterHistorySinceJoin } from '@/utils/playerHistory';
import { getPlayerSessionCost } from '@/utils/sessionCost';
import Modal from '../common/Modal';
import { useModalExit } from '@/hooks/useModalExit';
import { PlayerAvatar } from '../dashboard/PlayerAvatar';
import AchievementBadge from './AchievementBadge';
import type { ExtendedPlayerStats, HistoryEntry } from '@/types/ui';

interface PlayerSessionModalProps {
  /**
   * Statystyki z tego samego zakresu, z którego jest `history`: sezonu albo
   * całej kariery. Modal nie miesza zakresów — wybrany sezon 2027 pokazuje
   * 2027, „wszystkie" pokazują wszystko.
   */
  player: ExtendedPlayerStats | null;
  /** Sesje wybranego zakresu, od najnowszej do najstarszej. */
  history: HistoryEntry[];
  /** Rok wybranego sezonu albo `null`, gdy oglądamy wszystkie lata naraz. */
  seasonLabel?: string | null;
  onClose: () => void;
}

// ─── Player Session Drill-Down Modal ─────────────────────────────
export default function PlayerSessionModal({ player, history, seasonLabel, onClose }: PlayerSessionModalProps) {
  const titleId = useId();
  const [showMissed, setShowMissed] = useState(false);
  const { open, close } = useModalExit(onClose);

  // Sesje sprzed dołączenia gracza nie są przez niego „opuszczone" — ten sam
  // zakres musi zasilać licznik, listę nieobecności, numerację i odznaki.
  const eligibleHistory = useMemo(
    () => filterHistorySinceJoin(history, player?.joinDate),
    [history, player?.joinDate],
  );

  const { sessions, missedSessions } = useMemo(() => {
    if (!player) return { sessions: [], missedSessions: [] };
    return {
      sessions: eligibleHistory.filter(s => s.presentPlayers.includes(player.name)),
      missedSessions: eligibleHistory.filter(s => !s.presentPlayers.includes(player.name)),
    };
  }, [eligibleHistory, player]);

  const currentStreak = player?.currentStreak || 0;

  const achievements = useMemo(() => {
    if (!player) return [];
    return getPlayerAchievements(player, eligibleHistory);
  }, [player, eligibleHistory]);

  const scopeLabel = seasonLabel ?? 'wszystkie sezony';

  // Domyślnie tylko sesje z obecnością. Nieobecności są na żądanie, bo przy
  // długiej historii dominowały widok i mnożyły węzły w DOM-ie.
  const visibleSessions = useMemo(
    () => (showMissed ? eligibleHistory : eligibleHistory.filter(s => s.presentPlayers.includes(player?.name ?? ''))),
    [eligibleHistory, showMissed, player],
  );

  if (!player) return null;

  const c = getPlayerColor(player.name);

  return (
    // `bare` — okno ma własną szapkę z awatarem i sekcje na całą szerokość,
    // więc bierze z prymitywu tylko nakładkę: blokadę przewijania, pułapkę
    // fokusu, Escape, klik w tło, portal i rozmycie na `::before`.
    <Modal open={open} onClose={onClose} bare ariaLabel={`Szczegóły gracza ${player.name}`}>
      <div
        className="modal-panel cut-corners"
        role="document"
        aria-labelledby={titleId}
        style={{ maxWidth: 520, borderColor: `${c.border}40` }}
      >
        {/* Header */}
        <div className="modal-head" style={{
          borderBottomColor: `${c.border}20`,
          background: `${c.border}07`,
        }}>
          <PlayerAvatar name={player.name} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p id={titleId} style={{ ...FONT.display(TEXT.h3, TRACK.tight), color: 'var(--co-text-hi)', margin: 0, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.name}
            </p>
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: TRACK.normal }}>
              {scopeLabel} · {player.attendanceCount}/{player.eligibleWeeks} sesji · {player.attendancePercentage}% frekwencja
            </p>
          </div>
          <button onClick={close} aria-label="Zamknij" className="modal-close-btn icon-btn" style={{
            background: 'transparent', border: 'none',
            color: 'var(--co-dim)', cursor: 'pointer',
            width: 44, height: 44, marginRight: -10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} style={{ pointerEvents: 'none' }} aria-hidden="true" />
          </button>
        </div>

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1, padding: '0', background: 'var(--co-border)',
          borderBottom: `1px solid ${c.border}15`,
        }}>
          {[
            { label: 'Sesje', value: sessions.length, color: c.border },
            { label: 'Opuszczone', value: missedSessions.length, color: 'var(--co-dim)' },
            { label: 'Seria', value: currentStreak, color: currentStreak > 2 ? 'var(--co-cyan)' : 'var(--co-dim)' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '12px 8px', textAlign: 'center', background: 'var(--co-panel)' }}>
              <p style={{ ...FONT.display(TEXT.h2, TRACK.tight), color: stat.color, margin: 0, lineHeight: 1, textShadow: 'var(--glow-cyan-sm)' }}>
                {stat.value}
              </p>
              <p style={{ ...FONT.monoLabel, margin: '4px 0 0' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Rank progression */}
        {(() => {
          // Ranga idzie z wybranego zakresu, nie zawsze z kariery: w styczniu
          // sezon to czysta karta i ranga sezonowa jest dokładnie tym, o co
          // toczy się gra w danym roku.
          const pct = player.attendancePercentage;
          const currentRank = getRank(pct);
          const rankIdx = RANKS.findIndex(r => r.name === currentRank.name);
          const nextRank = rankIdx > 0 ? RANKS[rankIdx - 1] : null;
          return (
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${c.border}15`, background: rankTint(currentRank, 2) }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ ...FONT.display(TEXT.base, TRACK.tight), color: currentRank.hex, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <RankGlyph rank={currentRank} size={14} /> {currentRank.name}
                  {!seasonLabel && (
                    <span style={{ ...FONT.monoMicro, color: 'var(--co-dim)', marginLeft: 6 }}>
                      wszystkie sezony
                    </span>
                  )}
                </span>
                {nextRank ? (
                  <span style={{ ...FONT.monoSmall, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    do <RankGlyph rank={nextRank} size={11} /> {nextRank.name}: <span style={{ color: nextRank.hex }}>{Math.max(0, nextRank.min - pct)}%</span>
                  </span>
                ) : (
                  <span style={{ ...FONT.mono(TEXT.small), color: currentRank.hex }}>
                    ★ max ranga
                  </span>
                )}
              </div>
              <div style={{ height: 3, background: 'var(--co-bar-track)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: '100%', borderRadius: 2,
                  background: nextRank
                    ? 'var(--co-cyan)'
                    : currentRank.hex,
                  boxShadow: 'var(--glow-box-cyan)',
                  /* `scaleX` zamiast `width`: wypełnienie paska rangi nie
                     przelicza layoutu okna przy otwarciu (motion floor). */
                  transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`,
                  transformOrigin: 'left center',
                  transition: 'transform 0.6s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ ...FONT.monoMicro }}>0%</span>
                <span style={{ ...FONT.mono(TEXT.small), color: currentRank.hex }}>{pct}%</span>
                <span style={{ ...FONT.monoMicro }}>100%</span>
              </div>
            </div>
          );
        })()}

        {/* Achievements */}
        {achievements.length > 0 && (
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${c.border}15` }}>
              <p style={{ ...FONT.monoLabel, marginBottom: 8 }}>
                // osiągnięcia · {scopeLabel} — {achievements.length}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} accentColor={c.border} />
                ))}
              </div>
            </div>
        )}

        {/* Session log */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <p style={{ ...FONT.monoLabel, margin: 0, flex: 1 }}>
              // historia sesji — obecny na {sessions.length} z {eligibleHistory.length}
            </p>
            {/* Lista renderowała całą historię, w tym wszystkie nieobecności —
                przy długiej historii okno było w większości wyszarzonymi
                wierszami, a w DOM-ie lądowały setki węzłów. */}
            <button
              type="button"
              onClick={() => setShowMissed(v => !v)}
              aria-pressed={showMissed}
              className="icon-btn"
              style={{
                minHeight: 44, padding: '8px 10px', flexShrink: 0,
                background: 'transparent', border: '1px solid var(--co-border)',
                color: showMissed ? 'var(--co-cyan)' : 'var(--co-dim)',
                cursor: 'pointer', clipPath: CLIP.badge,
                ...FONT.mono(TEXT.tiny),
              }}
            >
              {showMissed ? 'Ukryj nieobecne' : `Pokaż nieobecne (${missedSessions.length})`}
            </button>
          </div>
          {eligibleHistory.length === 0 && (
            <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
              Brak danych sesji
            </p>
          )}
          {visibleSessions.map((session) => {
            const attended = session.presentPlayers.includes(player.name);
            const isMulti = session.multisportPlayers.includes(player.name);
            // Numer liczony z pozycji w pełnej, ale już przyciętej dołączeniem
            // historii — nie w przefiltrowanej liście, żeby po ukryciu
            // nieobecności numeracja się nie przesuwała.
            const sessionNo = eligibleHistory.length - eligibleHistory.indexOf(session);

            // Każdy obecny płaci swój udział; posiadacze karty Multisport mają
            // od niego stałą zniżkę, więc czasem wychodzi im dokładnie 0 zł.
            let costLabel = '—';
            if (attended) {
              const playerCost = getPlayerSessionCost(session, player.name);
              costLabel = playerCost === 0 ? 'free' : `${playerCost.toFixed(2)} zł`;
            }

            return (
              <div key={session.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', marginBottom: 3,
                background: attended ? `${c.border}08` : 'transparent',
                border: `1px solid ${attended ? c.border + '25' : 'var(--co-border)'}`,
                clipPath: CLIP.card,
                // 0.45 na tekście w --co-dim dawało ok. 1,3:1 — wiersze
                // nieobecności były praktycznie niewidoczne.
                opacity: attended ? 1 : 0.75,
                transition: 'opacity 0.15s',
              }}>
                {/* Session number */}
                <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', minWidth: 34, flexShrink: 0 }}>
                  #{String(sessionNo).padStart(2,'0')}
                </span>
                {/* Status dot */}
                <div aria-hidden="true" style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: attended ? c.border : 'var(--co-dim)',
                }} />
                {/* Date */}
                <span style={{ ...FONT.mono(TEXT.small), color: attended ? 'var(--co-text)' : 'var(--co-dim)', flex: 1 }}>
                  {formatDate(session.datePlayed)}
                </span>
                {/* Multi badge */}
                {isMulti && (
                  <span title="Multisport" style={{ ...FONT.display(TEXT.micro, TRACK.normal), color: 'var(--co-green)', padding: '1px 4px', border: '1px solid var(--co-green)', background: 'var(--co-tint-green)' }}>
                    M+
                  </span>
                )}
                {/* Cost / absent */}
                <span style={{ ...FONT.mono(TEXT.small), color: attended ? (isMulti ? 'var(--co-green)' : c.border) : 'var(--co-dim)', minWidth: 64, textAlign: 'right', flexShrink: 0 }}>
                  {costLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
