import { useState } from 'react';
import WrappedModal from '@/components/attendance/WrappedModal';
import { WRAPPED_DEMO_STATS } from './wrappedDemoStats';
import { FONT, TEXT, TRACK } from '@/constants/styles';

/**
 * Podgląd Wrapped na dummy danych — tylko dev, URL: /dev/wrapped
 * (AppShell pomija ładowanie Firebase na tej ścieżce).
 */
export default function WrappedPreviewPage() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--co-void)', padding: 24, flexDirection: 'column', gap: 16,
      }}>
        <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', textAlign: 'center' }}>
          Podgląd zamknięty. Kliknij, aby otworzyć ponownie.
        </p>
        <button
          type="button"
          className="cyber-button-yellow"
          onClick={() => setOpen(true)}
          style={{ padding: '12px 24px' }}
        >
          Otwórz Wrapped (demo)
        </button>
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim2)', letterSpacing: TRACK.normal }}>
          Dane: {WRAPPED_DEMO_STATS.year} · {WRAPPED_DEMO_STATS.totalSessions} sesji · 6 graczy
        </p>
      </div>
    );
  }

  return <WrappedModal stats={WRAPPED_DEMO_STATS} onClose={() => setOpen(false)} embedded />;
}
