// Loading skeleton and spinner components — Cyberpunk theme

export function PlayerCardSkeleton() {
  return (
    <div style={{
      background: 'var(--sw-panel)', border: '1px solid var(--sw-border)',
      clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
      overflow: 'hidden', animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--sw-border)', background: 'rgba(255,0,255,0.02)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 56, height: 56, background: '#111', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: '#111', marginBottom: 8, width: '60%' }} />
          <div style={{ height: 6, background: 'var(--sw-panel)', width: '40%' }} />
        </div>
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ height: 3, background: '#111', marginBottom: 14 }} />
        <div style={{ height: 60, background: '#0a0a0f', marginBottom: 12, clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }} />
        <div style={{ height: 40, background: '#111', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }} />
      </div>
      <style>{`@keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div style={{
      background: 'var(--sw-dark)', border: '1px solid var(--sw-border)',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px', animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ height: 8, background: '#111', width: 120 }} />
        <div style={{ height: 8, background: '#111', width: 60 }} />
      </div>
      <div style={{ height: 6, background: 'var(--sw-panel)', width: '80%', marginBottom: 6 }} />
      <div style={{ height: 6, background: 'var(--sw-panel)', width: '60%' }} />
    </div>
  );
}

export function SpinnerOverlay({ message = 'Ładowanie...' }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cyber-black)', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'var(--sw-pink)', boxShadow: '0 0 12px var(--sw-pink)' }} />
      <div style={{
        width: 50, height: 50,
        border: '2px solid #1a1a1a',
        borderTop: '2px solid var(--sw-pink)',
        borderRadius: '50%',
        animation: 'cyber-spin 0.8s linear infinite',
        boxShadow: '0 0 16px rgba(255,0,255,0.2)',
      }} />
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', letterSpacing: '0.2em', color: 'var(--sw-pink)', textTransform: 'uppercase', animation: 'flicker 2s infinite' }}>
        {message}
      </p>
      <style>{`
        @keyframes cyber-spin { to { transform: rotate(360deg); } }
        @keyframes flicker { 0%,19%,21%,23%,25%,54%,56%,100% { opacity: 1; } 20%,24%,55% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}

// Inline spinner — used inside buttons
export function InlineSpinner({ size = 'md' }) {
  const px = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  return (
    <span style={{
      display: 'inline-block',
      width: px, height: px,
      border: '2px solid rgba(0,0,0,0.2)',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'cyber-spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}
