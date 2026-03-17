// Loading skeleton and spinner components — Cold Operator theme

export function PlayerCardSkeleton() {
  return (
    <div style={{
      background: 'var(--co-panel)',
      border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'linear-gradient(105deg, transparent 35%, rgba(0,229,255,0.04) 50%, transparent 65%)',
        backgroundSize: '200% 100%',
        animation: 'gold-shimmer 1.8s linear infinite',
      }} />
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--co-border)', background: 'rgba(0,229,255,0.015)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 60, height: 60, flexShrink: 0,
          background: 'var(--co-raised)',
          border: '1px solid var(--co-border)',
          clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 10, background: 'var(--co-raised)', width: '65%', borderRadius: 1 }} />
          <div style={{ height: 6, background: 'rgba(0,229,255,0.08)', width: '40%', borderRadius: 1 }} />
          <div style={{ height: 2, background: 'var(--co-raised)', width: '100%', marginTop: 2 }} />
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: '14px' }}>
        <div style={{ height: 64, background: 'var(--co-dark)', marginBottom: 10, clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)', border: '1px solid var(--co-border)' }} />
        <div style={{ height: 36, background: 'rgba(0,229,255,0.04)', marginBottom: 8, clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)', border: '1px solid rgba(0,229,255,0.08)' }} />
        <div style={{ height: 30, background: 'var(--co-raised)', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }} />
      </div>
      <style>{`
        @keyframes gold-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div style={{
      background: 'var(--co-dark)', border: '1px solid var(--co-border)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(105deg, transparent 35%, rgba(0,229,255,0.03) 50%, transparent 65%)',
        backgroundSize: '200% 100%',
        animation: 'gold-shimmer 2s linear infinite',
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ height: 8, background: 'var(--co-raised)', width: 130, borderRadius: 1 }} />
        <div style={{ height: 8, background: 'var(--co-raised)', width: 60, borderRadius: 1 }} />
      </div>
      <div style={{ height: 6, background: 'rgba(0,229,255,0.06)', width: '80%', marginBottom: 6, borderRadius: 1 }} />
      <div style={{ height: 6, background: 'rgba(0,229,255,0.04)', width: '55%', borderRadius: 1 }} />
    </div>
  );
}

export function SpinnerOverlay({ message = 'Ładowanie...' }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--co-void)', flexDirection: 'column', gap: 28,
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--co-cyan), transparent)', boxShadow: '0 0 12px var(--co-cyan)' }} />
      {/* Crosshair spinner */}
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '1px solid rgba(0,229,255,0.15)',
          borderTop: '2px solid var(--co-cyan)',
          borderRadius: '50%',
          animation: 'cyber-spin 0.9s linear infinite',
          boxShadow: '0 0 16px rgba(0,229,255,0.2)',
        }} />
        <div style={{
          position: 'absolute', inset: 6,
          border: '1px solid rgba(0,229,255,0.08)',
          borderBottom: '2px solid rgba(0,229,255,0.5)',
          borderRadius: '50%',
          animation: 'cyber-spin 1.4s linear infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--co-cyan)',
          boxShadow: '0 0 8px var(--co-cyan)',
        }} />
      </div>
      <p style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.25em',
        color: 'rgba(0,229,255,0.7)', textTransform: 'uppercase',
        animation: 'flicker 2s infinite',
      }}>
        {message}
      </p>
      <style>{`
        @keyframes cyber-spin { to { transform: rotate(360deg); } }
        @keyframes flicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; } 20%,24%,55% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

// Inline spinner
export function InlineSpinner({ size = 'md' }) {
  const px = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  return (
    <span style={{
      display: 'inline-block',
      width: px, height: px,
      border: '1.5px solid rgba(0,229,255,0.2)',
      borderTop: '1.5px solid currentColor',
      borderRadius: '50%',
      animation: 'cyber-spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
