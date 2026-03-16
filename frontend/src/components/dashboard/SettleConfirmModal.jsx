import { HandCoins, CheckCircle2, X, Crosshair } from 'lucide-react';
import { formatAmountShort } from '../../utils/format';

export default function SettleConfirmModal({ playerName, debt, onConfirm, onCancel, tokens }) {
  if (!playerName) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(6px)' }}
    >
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(252,227,0,0.4)',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        boxShadow: '0 0 50px rgba(252,227,0,0.15), 0 4px 60px rgba(0,0,0,0.95)',
        padding: '26px 22px', width: '100%', maxWidth: 380,
      }}>
        {/* Yellow corner accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--cyber-yellow), transparent)', opacity: 0.6 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40,
            background: 'rgba(252,227,0,0.07)',
            border: '1px solid rgba(252,227,0,0.35)',
            clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <HandCoins size={18} style={{ color: 'var(--cyber-yellow)' }} />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.22em', color: 'var(--cyber-yellow)', opacity: 0.7, marginBottom: 3, textTransform: 'uppercase' }}>
              POTWIERDZENIE WPŁATY
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.06em', color: '#e8e8e8', margin: 0 }}>
              ROZLICZ GRACZA
            </h3>
          </div>
        </div>

        {/* Player name + amount */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#888', marginBottom: 12 }}>
            {'>'} <span style={{ color: '#e8e8e8', fontWeight: 600 }}>{playerName}</span> zapłacił?
          </p>
          <div style={{
            padding: '16px', textAlign: 'center',
            background: 'rgba(252,227,0,0.04)',
            border: '1px solid rgba(252,227,0,0.25)',
            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
          }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.2em', color: 'var(--cyber-text-dim)', marginBottom: 6, textTransform: 'uppercase' }}>
              Kwota do rozliczenia
            </p>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '2.2rem',
              color: 'var(--cyber-yellow)',
              textShadow: '0 0 20px rgba(252,227,0,0.4)',
            }}>
              {formatAmountShort(debt)}<span style={{ fontSize: '0.9rem', opacity: 0.4, marginLeft: 4 }}>ZŁ</span>
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} className="cyber-button-yellow" style={{
            flex: 1, padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontSize: '0.65rem',
          }}>
            <CheckCircle2 size={15} /> Tak, rozlicz
          </button>
          <button onClick={onCancel} className="cyber-button-outline" style={{
            flex: 1, padding: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <X size={15} /> ANULUJ
          </button>
        </div>
      </div>
    </div>
  );
}
