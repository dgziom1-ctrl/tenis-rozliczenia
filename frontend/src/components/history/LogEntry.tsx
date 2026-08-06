import { Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatAmount } from '@/utils/format';
import { SPORT_EMOJI, SPORT_SHORT, isCourtSport } from '@/constants';
import type { HistoryEntry } from '../../types/ui';

interface LogEntryProps {
  row: HistoryEntry;
  onEdit: (row: HistoryEntry) => void;
  onDelete: (id: string) => void;
}

export default function LogEntry({ row, onEdit, onDelete }: LogEntryProps) {
  const isSquash = isCourtSport(row.sport);
  return (
    <div className="scan-hover log-entry" style={{
      background: 'var(--co-dark)', border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px', marginBottom: 4,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
              background: isSquash ? 'rgba(0,255,136,0.08)' : 'rgba(0,229,255,0.06)',
              border: `1px solid ${isSquash ? 'rgba(0,255,136,0.3)' : 'rgba(0,229,255,0.2)'}`,
              color: isSquash ? 'var(--co-green)' : 'var(--co-cyan)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              {`${SPORT_EMOJI[row.sport] ?? '🏓'} ${SPORT_SHORT[row.sport] ?? 'PING'}`}
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

        {/* Data row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingLeft: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 2, textTransform: 'uppercase' }}>KOSZT</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--co-cyan)', textShadow: '0 0 8px rgba(0,229,255,0.3)' }}>
              {formatAmount(row.totalCost)}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 2, textTransform: 'uppercase' }}>NA OSOBĘ</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--co-cyan)' }}>
              {formatAmount(row.costPerPerson)}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 2, textTransform: 'uppercase' }}>
              OBECNI ({row.presentPlayers.length})
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.presentPlayers.join(', ')}
            </p>
            {row.multisportPlayers.length > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-green)', opacity: 0.7 }}>
                ⚡ {row.multisportPlayers.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Dogrywka */}
        {row.overtimePlayers && row.overtimePlayers.length > 0 && (row.overtimeCost ?? 0) > 0 && (
          <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--co-amber)', textTransform: 'uppercase' }}>
              ⏱ Dogrywka
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-amber)' }}>
              {formatAmount(row.overtimeCost ?? 0)} ({formatAmount(row.overtimePerPerson ?? 0)} / os.)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-dim)' }}>
              {row.overtimePlayers.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
