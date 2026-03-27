import { CalendarDays } from 'lucide-react';
import { getPlayerColor } from '../../constants/playerColors';
import { FONT, CLIP, PANEL } from '../../constants/styles';
import { SectionHeader } from '../common/SharedUI';

// ─── Monthly report ────────────────────────────────────────────────
export default function MonthlyReport({ monthlyStats, players }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 639;

  return (
    <div style={{
      ...PANEL.cyberCut,
    }}>
      <SectionHeader icon={CalendarDays} title="DANE MIESIĘCZNE" sub="obecność według miesiąca" />
      {monthlyStats.length === 0 ? (
        <p style={{ ...FONT.mono('0.8rem'), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
          {'>'} Brak danych — dodaj pierwszą sesję_
        </p>
      ) : (
        isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {monthlyStats.map(([month, rowData]) => {
              const presenceEntries = (players || []).map(p => ({
                name: p.name,
                count: rowData.players[p.name] || 0,
              }));

              const nonZero = presenceEntries.filter(e => e.count > 0).sort((a, b) => b.count - a.count);
              const top = nonZero.slice(0, 4);
              const restCount = Math.max(0, nonZero.length - top.length);

              return (
                <div
                  key={month}
                  style={{
                    background: 'var(--co-dark)',
                    border: '1px solid var(--co-border)',
                    clipPath: CLIP.smallCard,
                    padding: '14px 12px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
                    <span style={{ ...FONT.display('0.95rem', '0.12em'), color: 'var(--co-text-hi)', whiteSpace: 'nowrap' }}>
                      {month}
                    </span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-cyan)' }}>
                      SESJE: {rowData.total}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {top.length > 0 ? (
                      top.map((e) => {
                        const c = getPlayerColor(e.name);
                        const isMax = e.count === rowData.total;
                        return (
                          <span
                            key={e.name}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              background: isMax ? 'rgba(0,255,136,0.06)' : `${c.border}10`,
                              border: `1px solid ${isMax ? 'rgba(0,255,136,0.35)' : `${c.border}40`}`,
                              clipPath: CLIP.tag,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              color: isMax ? 'var(--co-green)' : 'var(--co-cyan)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>{e.count}</span>
                            <span style={{ opacity: 0.85, display: 'inline-block', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {e.name}
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ ...FONT.mono('0.7rem'), color: 'var(--co-dim)' }}>
                        Brak obecności
                      </span>
                    )}
                    {restCount > 0 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-dim)', padding: '6px 10px' }}>
                        +{restCount} więcej
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Scroll fade hint on mobile */}
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
              background: 'linear-gradient(to right, transparent, var(--co-panel))',
              pointerEvents: 'none', zIndex: 2,
            }} />
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--cz-border-hi, #2E2E28)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', fontWeight: 400, textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 2, borderRight: '1px solid rgba(0,229,255,0.08)' }}>
                      MIESIĄC
                    </th>
                    <th style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', fontWeight: 400, textTransform: 'uppercase' }}>
                      SESJE
                    </th>
                    {players?.map(p => {
                      const c = getPlayerColor(p.name);
                      return (
                        <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: '100%', height: 2, background: c.border, borderRadius: 1, opacity: 0.7 }} />
                            <span style={{ color: c.border, whiteSpace: 'nowrap' }}>{p.name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map(([month, rowData]) => (
                    <tr key={month} style={{ borderBottom: '1px solid var(--co-separator)' }}>
                      <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--co-text)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 1, borderRight: '1px solid rgba(0,229,255,0.08)' }}>{month}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--co-cyan)', textAlign: 'center' }}>{rowData.total}</td>
                      {players?.map(p => {
                        const presence = rowData.players[p.name] || 0;
                        const isMax = presence === rowData.total;
                        return (
                          <td key={p.name} style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 7px',
                              fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                              ...(isMax ? {
                                background: 'rgba(0,229,255,0.08)',
                                border: '1px solid rgba(0,229,255,0.3)',
                                color: 'var(--co-green)',
                              } : presence > 0 ? {
                                color: 'var(--co-cyan)',
                              } : {
                                color: 'var(--cz-dim2, #2A2A26)',
                              }),
                            }}>
                              {presence}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
