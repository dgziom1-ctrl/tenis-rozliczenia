import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { toCsv, downloadCsv } from '@/utils/csv';
import { FONT, TEXT } from '@/constants/styles';
import type { StatsCount, StatsData } from './statsApi';
import { deviceLabel, fmtAgo, fmtDateTime, fmtDay, fmtDuration, typeLabel, WEEKDAYS } from './format';

interface StatsViewProps {
  data: StatsData | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
  optedOut: boolean;
  onToggleOptOut: () => void;
}

const page: CSSProperties = {
  minHeight: '100vh', background: 'var(--co-void)', color: 'var(--co-text)',
  padding: '20px 16px 48px', ...FONT.mono(TEXT.base),
};
const wrap: CSSProperties = { maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 };
const card: CSSProperties = {
  background: 'var(--co-panel)', border: '1px solid var(--co-border)', padding: 14, minWidth: 0,
};
const h2: CSSProperties = { ...FONT.display(TEXT.lead), color: 'var(--co-text-hi)', margin: '0 0 10px', fontWeight: 700 };
const dim: CSSProperties = { color: 'var(--co-dim)' };
const btn: CSSProperties = {
  ...FONT.mono(TEXT.small), minHeight: 44, padding: '0 14px', cursor: 'pointer',
  background: 'var(--co-raised)', color: 'var(--co-cyan)', border: '1px solid var(--co-border-hi)',
};
const th: CSSProperties = { textAlign: 'left', padding: '6px 8px', color: 'var(--co-dim)', fontWeight: 500, whiteSpace: 'nowrap' };
const td: CSSProperties = { padding: '6px 8px', borderTop: '1px solid var(--co-border)', whiteSpace: 'nowrap' };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={card}>
      <h2 style={h2}>{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ ...dim, fontSize: TEXT.tiny }}>{label}</span>
      <span style={{ ...FONT.tech(TEXT.h2, 700), color: 'var(--co-cyan)' }}>{value}</span>
      {hint && <span style={{ ...dim, fontSize: TEXT.tiny }}>{hint}</span>}
    </div>
  );
}

function Bars({ items, empty = 'Brak danych' }: { items: StatsCount[]; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p style={dim}>{empty}</p>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item) => (
        <li key={item.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 48%) 1fr 36px', gap: 8, alignItems: 'center' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeLabel(item.key)}</span>
          <span aria-hidden="true" style={{ height: 8, background: 'var(--co-raised)' }}>
            <span style={{ display: 'block', height: '100%', width: `${(item.count / max) * 100}%`, background: 'var(--co-cyan)' }} />
          </span>
          <span style={{ textAlign: 'right', ...FONT.tech(TEXT.small, 600) }}>{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

/** Słupki: aktywne urządzenia dziennie, ostatnie 30 dni. */
function DailyChart({ daily }: { daily: StatsData['daily'] }) {
  const W = 720, H = 140, PAD = 22;
  const max = Math.max(1, ...daily.map((d) => d.devices));
  const bar = (W - PAD) / daily.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} width="100%" role="img" aria-label="Aktywne urządzenia dziennie, ostatnie 30 dni">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD} x2={W} y1={H - f * (H - 10)} y2={H - f * (H - 10)} stroke="var(--co-border)" strokeDasharray="3 4" />
          <text x={0} y={H - f * (H - 10) + 4} fill="var(--co-dim)" fontSize="11">{Math.round(max * f)}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const h = (d.devices / max) * (H - 10);
        const x = PAD + i * bar;
        return (
          <g key={d.day}>
            <title>{`${fmtDay(d.day)}: ${d.devices} urządzeń, ${d.sessions} sesji, ${d.events} zdarzeń${d.errors ? `, ${d.errors} błędów` : ''}`}</title>
            <rect x={x + 1} y={H - h} width={Math.max(1, bar - 3)} height={h} fill={d.errors ? 'var(--co-rose)' : 'var(--co-cyan)'} opacity={d.devices ? 1 : 0.15} />
            {i % 5 === 0 && <text x={x} y={H + 16} fill="var(--co-dim)" fontSize="11">{fmtDay(d.day)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Mapa cieplna: kiedy aplikacja jest uruchamiana (dzień tygodnia × godzina). */
function Heatmap({ heat }: { heat: number[][] }) {
  const max = Math.max(1, ...heat.flat());
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '28px repeat(24, minmax(14px, 1fr))', gap: 2, minWidth: 460 }}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} style={{ ...dim, fontSize: TEXT.tiny, textAlign: 'center' }}>{h % 3 === 0 ? h : ''}</span>
        ))}
        {heat.map((row, wd) => (
          <div key={WEEKDAYS[wd]} style={{ display: 'contents' }}>
            <span style={{ ...dim, fontSize: TEXT.tiny }}>{WEEKDAYS[wd]}</span>
            {row.map((count, h) => (
              <span
                key={h}
                title={`${WEEKDAYS[wd]} ${h}:00 — ${count} uruchomień`}
                style={{ height: 18, background: count ? 'var(--co-cyan)' : 'var(--co-raised)', opacity: count ? 0.25 + 0.75 * (count / max) : 1 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DevicesTable({ devices, now }: { devices: StatsData['devices']; now: number }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: TEXT.small }}>
        <thead>
          <tr>
            <th style={th}>Kto</th><th style={th}>Urządzenie</th><th style={th}>Ostatnio</th>
            <th style={th}>Sesji</th><th style={th}>Czas w apce</th><th style={th}>Zakładka</th>
            <th style={th}>Błędy</th><th style={th}>Wersja</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.did}>
              <td style={{ ...td, color: d.name ? 'var(--co-text-hi)' : 'var(--co-dim)' }}>{deviceLabel(d.name, d.did)}</td>
              <td style={td}>{[d.model || d.os, d.browser, d.pwa ? 'PWA' : null, d.screen].filter(Boolean).join(' · ')}</td>
              <td style={td} title={fmtDateTime(d.lastSeen)}>{fmtAgo(d.lastSeen, now)}</td>
              <td style={td}>{d.sessions}</td>
              <td style={td}>{fmtDuration(d.activeSeconds)}</td>
              <td style={td}>{d.lastTab || '—'}</td>
              <td style={{ ...td, color: d.errors ? 'var(--co-rose)' : undefined }}>{d.errors || '—'}</td>
              <td style={td}>{d.build || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentEvents({ events, now }: { events: StatsData['recent']; now: number }) {
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => `${e.type} ${typeLabel(e.type)} ${e.name} ${e.did} ${JSON.stringify(e.props)}`.toLowerCase().includes(q));
  }, [events, filter]);

  return (
    <>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtruj: imię, typ, zakładka…"
        aria-label="Filtruj zdarzenia"
        style={{ ...FONT.mono(TEXT.base), minHeight: 44, width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: '0 12px', background: 'var(--co-raised)', color: 'var(--co-text-hi)', border: '1px solid var(--co-border-hi)' }}
      />
      <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: TEXT.small }}>
          <thead>
            <tr><th style={th}>Kiedy</th><th style={th}>Kto</th><th style={th}>Co</th><th style={th}>Szczegóły</th></tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={`${e.ts}-${i}`}>
                <td style={td} title={fmtDateTime(e.ts)}>{fmtAgo(e.ts, now)}</td>
                <td style={td}>{deviceLabel(e.name, e.did)}</td>
                <td style={td}>{typeLabel(e.type)}</td>
                <td style={{ ...td, ...dim, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  {Object.entries(e.props).map(([k, v]) => `${k}=${String(v)}`).join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p style={dim}>Brak zdarzeń dla tego filtra</p>}
      </div>
    </>
  );
}

function exportEventsCsv(data: StatsData): void {
  const rows = [
    ['Kiedy', 'Kto', 'Urządzenie (id)', 'Typ', 'Szczegóły'],
    ...data.recent.map((e) => [
      new Date(e.ts).toISOString(), e.name, e.did, e.type,
      Object.entries(e.props).map(([k, v]) => `${k}=${String(v)}`).join('; '),
    ]),
  ];
  downloadCsv(`statystyki_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
}

export default function StatsView({ data, error, loading, onRefresh, optedOut, onToggleOptOut }: StatsViewProps) {
  // Czas względny liczymy od chwili wygenerowania danych, nie od renderu.
  const now = data?.generatedAt ?? 0;
  return (
    <main style={page}>
      <div style={wrap}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ ...FONT.display(TEXT.h2), color: 'var(--co-text-hi)', margin: 0 }}>Statystyki użycia</h1>
            <p style={{ ...dim, margin: '2px 0 0', fontSize: TEXT.small }}>
              {data ? `Stan z ${fmtDateTime(data.generatedAt)} · ${data.kpi.events} zdarzeń` : 'Ładowanie…'}
              {data?.truncated && ' · lista obcięta do najnowszych zdarzeń'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={btn} onClick={onRefresh} disabled={loading}>{loading ? 'Odświeżam…' : '↻ Odśwież'}</button>
            {data && <button type="button" style={btn} onClick={() => exportEventsCsv(data)}>Pobierz CSV</button>}
          </div>
        </header>

        {error && <p role="alert" style={{ ...card, color: 'var(--co-rose)', margin: 0 }}>{error}</p>}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              <Kpi label="Aktywni dziś" value={data.kpi.activeToday} hint="urządzeń" />
              <Kpi label="Aktywni 7 dni" value={data.kpi.active7d} hint={`z ${data.kpi.devices} wszystkich`} />
              <Kpi label="Aktywni 30 dni" value={data.kpi.active30d} />
              <Kpi label="Nowe urządzenia (7 dni)" value={data.kpi.newDevices7d} />
              <Kpi label="Sesje (7 dni)" value={data.kpi.sessions7d} hint="uruchomień apki" />
              <Kpi label="Średni czas sesji" value={fmtDuration(data.kpi.avgActiveSeconds)} hint="aktywny, 7 dni" />
              <Kpi label="Błędy (7 dni)" value={data.kpi.errors7d} />
              <Kpi label="Zainstalowane (PWA)" value={`${data.kpi.pwaShare}%`} hint={`${data.kpi.namedDevices} urządzeń z imieniem`} />
              <Kpi label="Ładowanie danych" value={data.kpi.medianDataReadyMs === null ? '—' : `${(data.kpi.medianDataReadyMs / 1000).toFixed(1)} s`} hint="mediana" />
            </div>

            <Section title="Aktywne urządzenia — ostatnie 30 dni"><DailyChart daily={data.daily} /></Section>
            <Section title="Kiedy odpalają aplikację (czas polski)"><Heatmap heat={data.heatmap} /></Section>
            <Section title={`Kto (${data.devices.length} urządzeń)`}><DevicesTable devices={data.devices} now={now} /></Section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <Section title="Zakładki"><Bars items={data.tabs} /></Section>
              <Section title="Co robią"><Bars items={data.actions} empty="Brak akcji" /></Section>
            </div>

            <Section title="Błędy">
              {data.errors.length === 0 ? <p style={dim}>Brak błędów</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: TEXT.small }}>
                    <thead><tr><th style={th}>Typ</th><th style={th}>Komunikat</th><th style={th}>Razy</th><th style={th}>Urządzeń</th><th style={th}>Ostatnio</th></tr></thead>
                    <tbody>
                      {data.errors.map((e) => (
                        <tr key={`${e.type}|${e.msg}`}>
                          <td style={td}>{typeLabel(e.type)}</td>
                          <td style={{ ...td, whiteSpace: 'normal', wordBreak: 'break-word' }}>{e.msg}</td>
                          <td style={td}>{e.count}</td><td style={td}>{e.devices}</td>
                          <td style={td}>{fmtAgo(e.last, now)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <Section title="Powiadomienia push">
                <Bars
                  empty="Brak danych o powiadomieniach"
                  items={[
                    ...Object.entries(data.push.permission).map(([k, count]) => ({ key: `zgoda: ${k}`, count })),
                    { key: 'zarejestrowane', count: data.push.registered },
                    { key: 'błędy rejestracji', count: data.push.errors },
                    { key: 'otwarcia z powiadomienia', count: data.push.opened },
                  ].filter((i) => i.count > 0)}
                />
              </Section>
              <Section title="Wersje aplikacji"><Bars items={data.versions} /></Section>
            </div>

            <Section title="Ostatnie zdarzenia"><RecentEvents events={data.recent} now={now} /></Section>
          </>
        )}

        <footer style={{ ...dim, fontSize: TEXT.small, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44, cursor: 'pointer' }}>
            <input type="checkbox" checked={optedOut} onChange={onToggleOptOut} style={{ width: 20, height: 20 }} />
            Nie zbieraj statystyk z tego urządzenia (moje wejścia nie zaśmiecają danych)
          </label>
        </footer>
      </div>
    </main>
  );
}
