import { FONT, TEXT } from '@/constants/styles';
import StreakBadge from '../attendance/StreakBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { RankBadge } from './RankBadge';
import type { HistoryEntry, PlayerCardMeta, PlayerColor, PlayerStats } from '@/types/ui';

interface CardIdentityProps {
  player: PlayerStats;
  playerColor: PlayerColor;
  meta: PlayerCardMeta;
  /** Sesje bieżącego sezonu — z nich kropki ostatnich obecności. */
  history: HistoryEntry[];
  isOrganizer: boolean;
  isPending: boolean;
  isMobile: boolean;
}

/** Tożsamość gracza: OVR, awatar, imię, ranga, seria i obecność z kropkami ostatnich sesji. */
export default function CardIdentity({ player, playerColor: c, meta, history, isOrganizer, isPending, isMobile }: CardIdentityProps) {
  const rank = meta.rank;
  const pct = meta.attendancePercentage;
  // Kropki ostatnich sesji (od najnowszej); na telefonie mieści się mniej.
  const recentSessions = (history ?? []).slice(0, isMobile ? 6 : 10);

  return (
    <div style={{
      padding: '14px',
      borderBottom: '1px solid var(--co-separator)',
      display: 'flex', gap: 14, alignItems: 'stretch',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', gap: 6, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="card-ovr" style={{ color: rank.hex }}>{meta.overall}</span>
          <span style={{ ...FONT.monoMicro, letterSpacing: 'normal', color: rank.hex, lineHeight: 1 }}>OVR</span>
        </div>
        <PlayerAvatar
          name={player.name}
          color={c}
          isPending={isOrganizer ? undefined : isPending}
        />
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8,
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
            letterSpacing: 'normal', textTransform: 'none',
            color: 'var(--co-text-hi)',
            margin: 0, lineHeight: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{player.name}</h3>

          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <RankBadge rank={rank} pct={pct} showHint={!isMobile} />
            {meta.currentStreak >= 2 && <StreakBadge streak={meta.currentStreak} />}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ ...FONT.monoLabel }}>
              Obecność
            </span>
            <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
              {meta.attendanceCount}/{meta.eligibleWeeks}
            </span>
          </div>
          <div style={{ height: 2, background: 'var(--co-bar-track)', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, right: 0,
              background: pct >= 75
                ? 'linear-gradient(90deg, var(--co-cyan), var(--co-green))'
                : pct >= 45
                ? 'linear-gradient(90deg, var(--co-green), var(--co-cyan))'
                : `linear-gradient(90deg, ${c.border}CC, ${c.border}66)`,
              /* Pasek obecności ma stałą szerokość i skaluje się z lewej —
                 bez przeliczania layoutu przy każdej zmianie danych. */
              transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`,
              transformOrigin: 'left center',
              transition: 'transform 0.8s ease',
            }} />
          </div>
          {history && history.length > 0 && (
            <div
              title={`Ostatnie ${recentSessions.length} sesji`}
              style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {[...recentSessions].reverse().map((session, i) => {
                const attended = session.presentPlayers.includes(player.name);
                return (
                  <div
                    key={session.id || i}
                    title={session.datePlayed}
                    style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: attended ? c.border : 'transparent',
                      border: `1px solid ${attended ? c.border : 'var(--co-dot-empty)'}`,
                      boxShadow: attended ? `0 0 4px ${c.border}80` : 'none',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
