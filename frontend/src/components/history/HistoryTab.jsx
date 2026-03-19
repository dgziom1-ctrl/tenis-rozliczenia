import { useState, useMemo } from 'react';
import { Terminal, Pencil, Trash2, Check, X, Zap, Users, CalendarDays, TrendingUp, BarChart2, Search } from 'lucide-react';
import { updateWeek, deleteWeek } from '../../firebase/index';
import { groupHistoryByMonth } from '../../utils/calculations';
import { formatDate, formatAmount } from '../../utils/format';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { PasswordModal } from '../common/SharedUI';

function EditDateInput({ value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="cyber-input" style={{
        width: '100%', padding: '10px 12px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', gap: 10,
        fontSize: '0.8rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
        pointerEvents: 'none',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)' }}>{formatDate(value)}</span>
        <CalendarDays size={14} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
      <input
        type="date" value={value} onChange={e => onChange(e.target.value)}
        onClick={e => e.currentTarget.showPicker?.()}
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          opacity: 0, cursor: 'pointer', zIndex: 2, padding: 0, border: 'none',
          boxSizing: 'border-box', fontSize: '16px',
        }}
      />
    </div>
  );
}


// Terminal log entry
function LogEntry({ row, onEdit, onDelete }) {
  return (
    <div className="scan-hover log-entry" style={{
      background: 'var(--co-dark)', border: '1px solid #141414',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px', marginBottom: 4,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Top row: date + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Terminal prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-cyan)', opacity: 0.5 }}>{'>'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--co-green)' }}>
              SESSION_{String(row.id).slice(-4).toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)' }}>
              {formatDate(row.datePlayed)}
            </span>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onEdit(row)} className="icon-btn" style={{
              padding: '5px 8px', background: 'transparent',
              border: '1px solid var(--co-border)', cursor: 'pointer',
              color: 'var(--co-dim)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(row.id)} className="icon-btn danger" style={{
              padding: '5px 8px', background: 'transparent',
              border: '1px solid var(--co-border)', cursor: 'pointer',
              color: 'var(--co-dim)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
            }}>
              <Trash2 size={13} />
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
      </div>
    </div>
  );
}


// ══ ATTENDANCE TREND CHART (pure SVG, no deps) ════════════════════════════════
function AttendanceTrendChart({ history, playerNames }) {
  const W = 560, H = 140, PAD = { top: 18, right: 16, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const data = useMemo(() => {
    if (!history || history.length === 0) return [];
    // Show last 12 sessions newest→oldest, display oldest→newest
    const recent = [...history].slice(0, 12).reverse();
    return recent.map((s, i) => ({
      i,
      date: s.datePlayed,
      count: s.presentPlayers.length,
      cost: s.costPerPerson || 0,
      label: new Date(s.datePlayed).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' }),
    }));
  }, [history]);

  if (data.length < 2) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const maxCost  = Math.max(...data.map(d => d.cost), 1);
  const n = data.length;

  const xPos  = i => PAD.left + (i / (n - 1)) * innerW;
  const yCount = v => PAD.top + innerH - (v / maxCount) * innerH;
  const yCost  = v => PAD.top + innerH - (v / maxCost)  * innerH;

  // Smooth SVG path using bezier curves
  const linePath = (pts) => pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + x) / 2;
    return `${acc} C${cpx},${prev[1]} ${cpx},${y} ${x},${y}`;
  }, '');

  const countPts = data.map(d => [xPos(d.i), yCount(d.count)]);
  const costPts  = data.map(d => [xPos(d.i), yCost(d.cost)]);

  // Filled area under count line
  const areaPath = `${linePath(countPts)} L${xPos(n-1)},${PAD.top+innerH} L${xPos(0)},${PAD.top+innerH} Z`;

  // Y-axis grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => ({
    y: PAD.top + innerH * (1 - p),
    label: Math.round(maxCount * p),
  }));

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Chart header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ padding: '5px 7px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <TrendingUp size={13} style={{ color: 'var(--co-cyan)', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.1em', color: 'var(--co-cyan)', textTransform: 'uppercase' }}>
            Trend frekwencji
          </span>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { color: '#00E5FF', label: 'obecni' },
            { color: '#FF2090', label: 'koszt/os.' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 2, background: color, boxShadow: `0 0 4px ${color}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div style={{ position: 'relative', background: 'rgba(0,229,255,0.015)', border: '1px solid var(--co-border)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', overflow: 'hidden' }}>
        {/* Scanline overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)' }} />

        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
          <defs>
            {/* Area fill gradient */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.01" />
            </linearGradient>
            {/* Glow filter for lines */}
            <filter id="lineGlow" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid lines + Y labels */}
          {gridLines.map(({ y, label }) => (
            <g key={y}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="rgba(0,229,255,0.07)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fill="rgba(0,229,255,0.3)" fontSize="9" fontFamily="Space Mono, monospace">
                {label}
              </text>
            </g>
          ))}

          {/* Vertical session markers */}
          {data.map(d => (
            <line key={d.i} x1={xPos(d.i)} y1={PAD.top} x2={xPos(d.i)} y2={PAD.top + innerH}
              stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}

          {/* Area fill under count line */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Cost line (magenta, dashed) */}
          <path d={linePath(costPts)} fill="none"
            stroke="#FF2090" strokeWidth="1.5"
            strokeDasharray="5 3" opacity="0.7"
            filter="url(#lineGlow)" />

          {/* Attendance count line (cyan, solid) */}
          <path d={linePath(countPts)} fill="none"
            stroke="#00E5FF" strokeWidth="2"
            filter="url(#lineGlow)" />

          {/* Data point dots — cyan */}
          {countPts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="5" fill="var(--co-panel)" stroke="#00E5FF" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="2.5" fill="#00E5FF" />
              {/* Value label */}
              <text x={x} y={y - 9} textAnchor="middle"
                fill="#00E5FF" fontSize="9" fontFamily="Space Mono, monospace" opacity="0.8">
                {data[i].count}
              </text>
            </g>
          ))}

          {/* Cost dots — magenta */}
          {costPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill="var(--co-panel)" stroke="#FF2090" strokeWidth="1.5" opacity="0.8" />
          ))}

          {/* X-axis date labels — every other one on mobile */}
          {data.map((d, i) => (
            (i % Math.max(1, Math.floor(n / 6)) === 0) && (
              <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle"
                fill="rgba(168,192,212,0.5)" fontSize="8" fontFamily="Space Mono, monospace">
                {d.label}
              </text>
            )
          ))}
        </svg>
      </div>

      {/* Mini stats bar */}
      <div style={{ display: 'flex', gap: 1, marginTop: 8 }}>
        {[
          { label: 'Śr. obecność', value: (data.reduce((s, d) => s + d.count, 0) / data.length).toFixed(1) + ' os.', color: 'var(--co-cyan)' },
          { label: 'Śr. koszt', value: (data.reduce((s, d) => s + d.cost, 0) / data.length).toFixed(2) + ' zł', color: '#FF2090' },
          { label: 'Max sesja', value: Math.max(...data.map(d => d.count)) + ' os.', color: 'var(--co-green)' },
          { label: 'Sesji', value: `${data.length}`, color: 'var(--co-ice, #0080FF)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: '8px 10px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color, margin: 0, lineHeight: 1, textShadow: `0 0 8px ${color}40` }}>{value}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--co-dim)', margin: '4px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryTab({ history, playerNames, playSound }) {
  const [editingId,  setEditingId]  = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [isSaving,   setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [pwModal,    setPwModal]    = useState(null);
  const [filterPlayer, setFilterPlayer] = useState('');
  const { showError } = useToast();

  const filteredHistory = useMemo(() => {
    if (!filterPlayer) return history;
    return history.filter(s => s.presentPlayers.includes(filterPlayer));
  }, [history, filterPlayer]);

  const requestEdit   = (row) => setPwModal({ type: 'edit', row });
  const requestDelete = (id)  => setPwModal({ type: 'delete', rowId: id });

  const handlePasswordConfirm = () => {
    if (pwModal.type === 'edit') {
      const row = pwModal.row;
      setEditingId(row.id);
      setEditForm({ date: row.datePlayed, cost: row.totalCost, present: [...row.presentPlayers], multiPlayers: [...row.multisportPlayers] });
    } else if (pwModal.type === 'delete') {
      setDeletingId(pwModal.rowId);
    }
    setPwModal(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await updateWeek(editingId, { date: editForm.date, cost: parseFloat(editForm.cost), present: editForm.present, multiPlayers: editForm.multiPlayers });
      if (!result.success) { showError(result.error || 'Nie udało się zapisać sesji'); return; }
      setEditingId(null); setEditForm({});
    } finally { setIsSaving(false); }
  };

  const togglePresent = (name) => {
    setEditForm(prev => {
      const inList = (prev.present || []).includes(name);
      return { ...prev, present: inList ? prev.present.filter(p => p !== name) : [...prev.present, name], multiPlayers: inList ? (prev.multiPlayers || []).filter(p => p !== name) : prev.multiPlayers };
    });
  };

  const toggleMulti = (name) => {
    setEditForm(prev => {
      const inList = (prev.multiPlayers || []).includes(name);
      return { ...prev, multiPlayers: inList ? prev.multiPlayers.filter(p => p !== name) : [...prev.multiPlayers, name] };
    });
  };

  const handleDelete = async (id) => {
    if (isDeleting) return;
    setIsDeleting(id);
    try {
      const result = await deleteWeek(id);
      if (!result.success) { showError(result.error || 'Nie udało się usunąć sesji'); return; }
      setDeletingId(null);
    } finally { setIsDeleting(null); }
  };

  const grouped = groupHistoryByMonth(filteredHistory);

  return (
    <>
      {pwModal && (
        <PasswordModal
          action={pwModal.type === 'edit' ? 'Podaj kod dostępu aby edytować sesję.' : 'Podaj kod dostępu aby usunąć sesję.'}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
          playSound={playSound}
        />
      )}

      <div className="cyber-box" style={{
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)',
        padding: '20px 18px',
        animation: 'slide-in-up 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid var(--co-border)' }}>
          <div style={{ padding: '6px 8px', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <Terminal size={14} style={{ color: 'var(--co-green)', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--co-green)' }}>
            HISTORIA
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(0,229,255,0.2), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)' }}>
            {history.length} REKORDÓW
          </span>
        </div>

        {/* Boot text */}
        <div style={{ marginBottom: 20, padding: '10px 14px', background: '#060609', border: '1px solid #0f0f0f' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--co-green)', lineHeight: 1.6, opacity: 0.7 }}>
            {'>'} System OK<br/>
            {'>'} Ładowanie historii...<br/>
            {'>'} {history.length} rekordów znaleziono<br/>
            {'>'} Dostęp przyznany<span style={{ animation: 'blink-cursor 1s step-end infinite', color: 'var(--co-green)' }}>▮</span>
          </p>
        </div>

        {/* Filter bar */}
        {playerNames && playerNames.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
              <Search size={11} style={{ color: 'var(--co-dim)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>FILTR</span>
            </div>
            <button
              onClick={() => setFilterPlayer('')}
              style={{
                fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.08em',
                padding: '4px 10px', cursor: 'pointer', border: '1px solid',
                borderColor: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-border)',
                color: !filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
                background: !filterPlayer ? 'rgba(0,229,255,0.08)' : 'transparent',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                transition: 'all 0.15s',
              }}
            >
              WSZYSCY
            </button>
            {playerNames.map(name => (
              <button
                key={name}
                onClick={() => setFilterPlayer(prev => prev === name ? '' : name)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.08em',
                  padding: '4px 10px', cursor: 'pointer', border: '1px solid',
                  borderColor: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-border)',
                  color: filterPlayer === name ? 'var(--co-cyan)' : 'var(--co-dim)',
                  background: filterPlayer === name ? 'rgba(0,229,255,0.08)' : 'transparent',
                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                  transition: 'all 0.15s',
                }}
              >
                {name}
              </button>
            ))}
            {filterPlayer && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--co-dim)', marginLeft: 4 }}>
                {filteredHistory.length} sesji
              </span>
            )}
          </div>
        )}

        {/* Attendance trend chart */}
        {history.length >= 2 && (
          <AttendanceTrendChart history={history} playerNames={playerNames} />
        )}

        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays style={{ margin: '0 auto 16px', color: 'var(--co-dim)' }} size={40} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
              BRAK DANYCH
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--co-dim)', marginTop: 8 }}>
              {'>'} Dodaj pierwszą sesję w zakładce LOG_
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(({ label, rows }) => (
            <div key={label}>
              {/* Month header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#060C12', border: '1px solid var(--co-border)', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--co-cyan)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#3a3a3a' }}>[{rows.length}x]</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(0,229,255,0.25), transparent)' }} />
              </div>

              {/* Log entries */}
              <div>
                {rows.map((row) => {
                  const isEditingRow  = editingId  === row.id;
                  const isDeletingRow = deletingId === row.id;

                  if (isEditingRow) return (
                    <div key={row.id} style={{
                      background: '#060C12', border: '1px solid rgba(0,229,255,0.25)',
                      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
                      padding: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>DATA</label>
                          <EditDateInput value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--co-cyan)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>KOSZT</label>
                          <input type="number" value={editForm.cost}
                            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
                            className="cyber-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.8rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                          />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: 'var(--co-dim)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                          <Users size={11} /> OBECNI
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                          {playerNames.map(name => (
                            <button type="button" key={name} onClick={() => togglePresent(name)}
                              style={{
                                padding: '7px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 600,
                                letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                                transition: 'all 0.15s',
                                ...(editForm.present?.includes(name) ? {
                                  borderColor: 'rgba(0,229,255,0.5)', background: 'rgba(0,229,255,0.08)', color: 'var(--co-cyan)',
                                } : {
                                  borderColor: 'var(--co-border)', background: 'transparent', color: 'var(--co-dim)',
                                }),
                              }}>
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                      {editForm.present?.length > 0 && (
                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.15em', color: 'var(--co-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
                            <Zap size={11} /> MULTISPORT
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            {editForm.present.map(name => (
                              <button type="button" key={name} onClick={() => toggleMulti(name)}
                                style={{
                                  padding: '7px 8px', fontSize: '0.65rem', fontFamily: 'var(--font-display)', fontWeight: 600,
                                  letterSpacing: '0.06em', cursor: 'pointer', border: '1px solid',
                                  clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
                                  transition: 'all 0.15s',
                                  ...(editForm.multiPlayers?.includes(name) ? {
                                    borderColor: 'rgba(0,229,255,0.5)', background: 'rgba(0,229,255,0.07)', color: 'var(--co-green)',
                                  } : {
                                    borderColor: 'var(--co-border)', background: 'transparent', color: 'var(--co-dim)',
                                  }),
                                }}>
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={saveEdit} disabled={isSaving}
                          className="cyber-button-yellow" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {isSaving ? <><InlineSpinner size="sm" /> Zapisuję...</> : <><Check size={14} /> Zapisz</>}
                        </button>
                        <button onClick={cancelEdit} disabled={isSaving}
                          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <X size={14} /> ANULUJ
                        </button>
                      </div>
                    </div>
                  );

                  if (isDeletingRow) return (
                    <div key={row.id} style={{
                      background: 'rgba(255,32,144,0.04)', border: '1px solid rgba(255,32,144,0.35)',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                      padding: 16, marginBottom: 4,
                      boxShadow: '0 0 20px rgba(255,32,144,0.1)',
                    }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--co-yellow)', marginBottom: 4, textTransform: 'uppercase' }}>
                        ⚠ Usunąć sesję z dnia {formatDate(row.datePlayed)}?
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--co-dim)', marginBottom: 14 }}>
                        Ta operacja jest nieodwracalna.
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleDelete(row.id)} disabled={isDeleting === row.id}
                          style={{
                            flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'var(--co-yellow)', color: '#000',
                            fontFamily: 'var(--font-display)', fontSize: '0.82rem', letterSpacing: '0.12em',
                            border: 'none', cursor: 'pointer',
                            clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
                            opacity: isDeleting === row.id ? 0.5 : 1,
                          }}>
                          {isDeleting === row.id ? <><InlineSpinner size="sm" /> USUWAM...</> : <><Trash2 size={14} /> POTWIERDŹ USUNIĘCIE</>}
                        </button>
                        <button onClick={() => setDeletingId(null)} disabled={isDeleting === row.id}
                          className="cyber-button-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <X size={14} /> ANULUJ
                        </button>
                      </div>
                    </div>
                  );

                  return (
                    <LogEntry key={row.id} row={row} onEdit={requestEdit} onDelete={requestDelete} />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
