import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { SPORT, SQUASH_MULTISPORT_DISCOUNT, OWN_RACKET_PLAYERS } from '@/constants';
import { useToast } from '../common/Toast';
import { formatDate, formatAmountShort } from '@/utils/format';
import { buildGroupMessage } from '@/utils/message';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Sport } from '@/types/domain';

interface SessionSummary {
  date: string;
  totalCost: number;
  presentCount: number;
  payingCount: number;
  multisportCount: number;
  perPerson: number;
  sport: Sport;
  presentPlayers: string[];
  multisportPlayers: string[];
  racketCost: number;
}

export interface SessionSummaryModalProps {
  summary: SessionSummary | null;
  onClose: () => void;
  tokens?: any;
}

export default function SessionSummaryModal({ summary, onClose }: SessionSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const { showError } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);
  useEffect(() => { overlayRef.current?.focus(); }, []);
  if (!summary) return null;
  const { date, totalCost, presentCount, payingCount, multisportCount, perPerson, presentPlayers, multisportPlayers, sport, racketCost } = summary;
  const isSquash = sport === SPORT.SQUASH;
  const hasRackets = isSquash && racketCost > 0;

  const handleCopy = async () => {
    const msg = buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, perPerson, sport, racketCost });
    try { await navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { showError('Nie udało się skopiować tekstu'); }
  };

  return (
    <div ref={overlayRef} tabIndex={-1} onKeyDown={e => e.key === 'Escape' && onClose()} role="dialog" aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'var(--co-overlay, rgba(0,0,0,0.95))', backdropFilter: 'blur(6px)' }}
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-enter" style={{
        background: 'var(--co-dark)',
        border: '1px solid rgba(0,229,255,0.4)',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        boxShadow: '0 0 60px rgba(0,229,255,0.15), 0 4px 60px rgba(0,0,0,0.95)',
        padding: '28px 24px', width: '100%', maxWidth: 400,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.35)',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={20} style={{ color: 'var(--co-green)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', color: 'var(--co-green)', marginBottom: 3, textTransform: 'uppercase' }}>
              Zapisano!
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--co-text-hi)', margin: 0 }}>
              Sesja zapisana!
            </h3>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'SPORT', value: isSquash ? '🎾 SQUASH' : '🏓 PING-PONG', color: isSquash ? 'var(--co-green)' : 'var(--co-cyan)' },
            { label: 'DATA', value: formatDate(date), color: 'var(--co-text)' },
            { label: 'KOSZT', value: `${formatAmountShort(totalCost)} ZŁ`, color: 'var(--co-cyan)' },
            { label: 'OBECNI', value: presentCount, color: 'var(--co-text)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '10px 12px', background: 'var(--co-dark)',
              border: '1px solid var(--co-border)',
              clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
            }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 4, textTransform: 'uppercase' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Per-person */}
        {presentCount > 0 && (
          <div style={{
            padding: '16px', marginBottom: 16, textAlign: 'center',
            background: 'rgba(0,229,255,0.04)',
            border: '1px solid rgba(0,229,255,0.3)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
            {isSquash ? (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
                  PODZIAŁ KOSZTÓW
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'var(--co-cyan)', textShadow: '0 0 20px rgba(0,229,255,0.5)', margin: 0 }}>
                  {formatAmountShort(perPerson + (hasRackets ? racketCost / Math.max(1, presentPlayers.filter(p => !OWN_RACKET_PLAYERS.includes(p)).length) : 0))}<span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4 }}>ZŁ / OS.</span>
                </p>
                {multisportCount > 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-green)', marginTop: 4 }}>
                    ⚡ Cena z kartą: {formatAmountShort(Math.max(0, perPerson - SQUASH_MULTISPORT_DISCOUNT) + (hasRackets ? racketCost / Math.max(1, presentPlayers.filter(p => !OWN_RACKET_PLAYERS.includes(p)).length) : 0))} zł · {multisportCount} os.
                  </p>
                )}
                {hasRackets && OWN_RACKET_PLAYERS.some(p => presentPlayers.includes(p)) && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-amber)', marginTop: 2 }}>
                    🎾 {OWN_RACKET_PLAYERS.filter(p => presentPlayers.includes(p)).join(', ')}: {formatAmountShort(perPerson)} zł (własna rakietka)
                  </p>
                )}
                {hasRackets && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', marginTop: 2 }}>
                    Kort: {formatAmountShort(totalCost - racketCost)} zł · Rakiety: {formatAmountShort(racketCost)} zł
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
                  KAŻDY PŁACI
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.4rem', color: 'var(--co-cyan)', textShadow: '0 0 20px rgba(0,229,255,0.5)', margin: 0 }}>
                  {formatAmountShort(perPerson)}<span style={{ fontSize: '1rem', opacity: 0.4, marginLeft: 4 }}>ZŁ</span>
                </p>
                {multisportCount > 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', marginTop: 4 }}>
                    {payingCount} os. płaci · {multisportCount} os. gratis
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Copy & close */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handleCopy} style={{
            width: '100%', padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em',
            cursor: 'pointer', transition: 'all 0.18s',
            ...(copied ? {
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.4)', color: 'var(--co-green)',
            } : {
              background: 'transparent', border: '1px solid var(--co-border)', color: 'var(--co-dim)',
            }),
            clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
          }}>
            {copied ? <><CheckCircle2 size={14} /> Skopiowano!</> : <><Copy size={14} /> Kopiuj na grupkę</>}
          </button>
          <button onClick={onClose} className="cyber-button-yellow" style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.65rem' }}>
            <CheckCircle2 size={14} /> OK — Powrót do bazy
          </button>
        </div>
      </div>
    </div>
  );
}
