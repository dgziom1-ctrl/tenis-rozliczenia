import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatAmount, formatAmountShort } from '@/utils/format';
import { SPORT_EMOJI, SPORT_SHORT, hasRacketRental } from '@/constants';
import { getShareGroups } from '@/utils/sessionCost';
import ShareBreakdown from '../common/ShareBreakdown';
import type { HistoryEntry } from '../../types/ui';

interface LogEntryProps {
  row: HistoryEntry;
  onEdit: (row: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

const labelStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: '0.8rem',
  letterSpacing: '0.12em',
  color: 'var(--co-dim)',
  marginBottom: 4,
  textTransform: 'uppercase',
} as const;

export default function LogEntry({ row, onEdit, onDelete }: LogEntryProps) {
  const isCourt = hasRacketRental(row.sport);
  const sportEmoji = SPORT_EMOJI[row.sport] ?? '🏓';
  const racketCost = row.racketCost ?? 0;
  const ownRacketPlayers = row.ownRacketPlayers ?? [];
  // Te same stawki, które widać w podglądzie przy dodawaniu i na grupie.
  const groups = getShareGroups(row);

  return (
    <div className="scan-hover log-entry" style={{
      background: 'var(--co-dark)', border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px', marginBottom: 4,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Top row: date + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-cyan)', opacity: 0.5 }}>{'>'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-green)' }}>
              SESSION_{String(row.id).slice(-4).toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)' }}>
              {formatDate(row.datePlayed)}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              padding: '2px 6px',
              background: isCourt ? 'rgba(0,255,136,0.08)' : 'rgba(0,229,255,0.06)',
              border: `1px solid ${isCourt ? 'rgba(0,255,136,0.3)' : 'rgba(0,229,255,0.2)'}`,
              color: isCourt ? 'var(--co-green)' : 'var(--co-cyan)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              {`${sportEmoji} ${SPORT_SHORT[row.sport] ?? 'PING'}`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => onEdit(row)} className="icon-btn" aria-label="Edytuj sesję" style={{
              minWidth: 38, minHeight: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 11px', background: 'transparent',
              border: '1px solid var(--co-border)', cursor: 'pointer',
              color: 'var(--co-dim)', touchAction: 'manipulation',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              <Pencil size={15} />
            </button>
            <button onClick={() => onDelete(row.id)} className="icon-btn danger" aria-label="Usuń sesję" style={{
              minWidth: 38, minHeight: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 11px', background: 'transparent',
              border: '1px solid var(--co-border)', cursor: 'pointer',
              color: 'var(--co-dim)', touchAction: 'manipulation',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Koszt + podział na stawki */}
        <div className="log-entry-grid" style={{ paddingLeft: 16 }}>
          <div>
            <p style={labelStyle}>Koszt</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--co-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.3)' }}>
              {formatAmount(row.totalCost)}
            </p>
            {racketCost > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-dim)', marginTop: 2 }}>
                kort {formatAmountShort(row.totalCost - racketCost)} · rakiety {formatAmountShort(racketCost)}
              </p>
            )}
          </div>

          <div>
            <p style={labelStyle}>Na osobę</p>
            <ShareBreakdown groups={groups} sportEmoji={sportEmoji} size="sm" />
          </div>
        </div>

        {/* Obecni — karta i własna rakietka oznaczone przy nazwisku */}
        <div style={{ paddingLeft: 16 }}>
          <p style={labelStyle}>Obecni ({row.presentPlayers.length})</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {row.presentPlayers.map(name => {
              const hasCard = row.multisportPlayers.includes(name);
              const hasOwnRacket = racketCost > 0 && ownRacketPlayers.includes(name);
              return (
                <span key={name} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                  padding: '2px 7px',
                  color: hasCard ? 'var(--co-green)' : 'var(--co-text)',
                  background: hasCard ? 'rgba(0,255,136,0.06)' : 'transparent',
                  border: `1px solid ${hasCard ? 'rgba(0,255,136,0.25)' : 'var(--co-border)'}`,
                  clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
                }}>
                  {hasCard && '⚡'}{hasOwnRacket && sportEmoji}{(hasCard || hasOwnRacket) && ' '}{name}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
