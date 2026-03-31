import { useRef, useEffect } from 'react';
import { CheckCircle2, HandCoins, X } from 'lucide-react';
import { formatAmountShort } from '@/utils/format';
import { InlineSpinner } from '../common/LoadingSkeleton';

export default function SettleConfirmModal({
  playerName,
  debt,
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const overlayRef = useRef(null);
  useEffect(() => { overlayRef.current?.focus(); }, []);

  if (!playerName) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--co-overlay, rgba(0,0,0,0.95))', backdropFilter: 'blur(6px)' }}
      tabIndex={-1}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{
        background: 'var(--co-dark)',
        border: '1px solid var(--co-border-hi)',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        padding: '26px 22px', width: '100%', maxWidth: 380,
      }}>
        {/* Yellow corner accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--co-cyan), transparent)', opacity: 0.6 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(0,229,255,0.07)',
            border: '1px solid var(--co-border-hi)',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HandCoins size={18} style={{ color: 'var(--co-cyan)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', opacity: 0.7, marginBottom: 3, textTransform: 'uppercase' }}>
              POTWIERDZENIE WPŁATY
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', letterSpacing: '0.06em', color: 'var(--co-text-hi)', margin: 0 }}>
              ROZLICZ GRACZA
            </h3>
          </div>
        </div>

        {/* Player name + amount */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--co-text)', marginBottom: 12 }}>
            {'>'} <span style={{ color: 'var(--co-text-hi)', fontWeight: 600 }}>{playerName}</span> zapłacił?
          </p>
          <div style={{
            padding: '16px', textAlign: 'center',
            background: 'rgba(0,229,255,0.04)',
            border: '1px solid rgba(0,229,255,0.25)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
              Kwota do rozliczenia
            </p>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '2.2rem',
              color: 'var(--co-cyan)',
              textShadow: 'none',
            }}>
              {formatAmountShort(debt)}<span style={{ fontSize: '0.9rem', opacity: 0.4, marginLeft: 4 }}>ZŁ</span>
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="cyber-button-yellow"
            style={{
            flex: 1, padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: '0.65rem',
            opacity: isProcessing ? 0.7 : 1,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
          }}
          >
            {isProcessing ? <InlineSpinner size="sm" /> : <CheckCircle2 size={15} />}
            {isProcessing ? 'Rozliczam...' : 'Tak, rozlicz'}
          </button>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="cyber-button-outline"
            style={{
            flex: 1, padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: isProcessing ? 0.7 : 1,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
          }}
          >
            <X size={15} /> ANULUJ
          </button>
        </div>
      </div>
    </div>
  );
}
