import { CalendarDays } from 'lucide-react';
import { getPlayerColor } from '@/constants/colors';
import { FONT, CLIP, PANEL, TEXT, TRACK } from '../../constants/styles';
import { SectionHeader } from '../common/SharedUI';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { MonthlySessionData, PlayerStats } from '@/types/ui';

interface MonthlyReportProps {
  monthlyStats: [string, MonthlySessionData][];
  players: PlayerStats[];
}

// ─── Monthly report ────────────────────────────────────────────────
export default function MonthlyReport({ monthlyStats, players }: MonthlyReportProps) {
  const isMobile = useIsMobile();

  return (
    <div style={{
      ...PANEL.cyberCut,
    }}>
      <SectionHeader icon={CalendarDays} title="DANE MIESIĘCZNE" sub="obecność według miesiąca" />
      {monthlyStats.length === 0 ? (
        <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', textAlign: 'center', padding: '40px 0' }}>
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
                    <span style={{ ...FONT.display(TEXT.lead, TRACK.normal), color: 'var(--co-text-hi)', whiteSpace: 'nowrap' }}>
                      {month}
                    </span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--co-cyan)' }}>
                      SESJE: {rowData.total}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {nonZero.length > 0 ? (
                      nonZero.map((e) => {
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
                              background: isMax ? 'var(--co-tint-green)' : `${c.border}10`,
                              border: `1px solid ${isMax ? 'var(--co-green)' : `${c.border}40`}`,
                              clipPath: CLIP.tag,
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.8125rem',
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
                      <span style={{ ...FONT.mono(TEXT.micro), color: 'var(--co-dim)' }}>
                        Brak obecności
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Gradient sugerujący, że tabela przewija się w prawo.
                Miał z-index 2 — tyle samo co przyklejony nagłówek i więcej niż
                przyklejone komórki (1), więc przy prawej krawędzi malował się
                na nich. Teraz siedzi nad treścią, ale pod przyklejoną kolumną. */}
            <div aria-hidden="true" style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
              background: 'linear-gradient(to right, transparent, var(--co-panel))',
              pointerEvents: 'none', zIndex: 0,
            }} />
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400, fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--co-border-hi)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', textTransform: 'uppercase', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 3, borderRight: '1px solid var(--co-border)' }}>
                      MIESIĄC
                    </th>
                    <th style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', fontWeight: 400, textTransform: 'uppercase' }}>
                      SESJE
                    </th>
                    {players?.map(p => {
                      const c = getPlayerColor(p.name);
                      return (
                        <th key={p.name} style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 400 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
                      {/* Przyklejona kolumna musi być nad gradientem i nad
                          własnym obramowaniem wiersza, inaczej wygląda, jakby
                          unosiła się nad tabelą. */}
                      <td style={{ padding: '10px 12px', fontSize: '0.875rem', color: 'var(--co-text)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--co-panel)', zIndex: 2, borderRight: '1px solid var(--co-border)', borderBottom: '1px solid var(--co-separator)' }}>{month}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--co-cyan)', textAlign: 'center' }}>{rowData.total}</td>
                      {players?.map(p => {
                        const presence = rowData.players[p.name] || 0;
                        const isMax = presence === rowData.total;
                        return (
                          <td key={p.name} style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 6px',
                              fontFamily: 'var(--font-mono)', fontSize: '0.8125rem',
                              ...(isMax ? {
                                background: 'var(--co-tint-hi)',
                                border: '1px solid var(--co-tint-line)',
                                color: 'var(--co-green)',
                              } : presence > 0 ? {
                                color: 'var(--co-cyan)',
                              } : {
                                color: 'var(--co-dim2)',
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
