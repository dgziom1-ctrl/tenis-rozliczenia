import { useState } from 'react';
import { Terminal, Pencil, Trash2, Check, X, Zap, Users, Lock, CalendarDays } from 'lucide-react';
import { updateWeek, deleteWeek } from '../../firebase/index';
import { ADMIN_PASSWORD } from '../../constants';
import { groupHistoryByMonth } from '../../utils/calculations';
import { formatDate, formatAmount } from '../../utils/format';
import { useToast } from '../common/Toast';
import { InlineSpinner } from '../common/LoadingSkeleton';
import { useThemeTokens } from '../../context/ThemeContext';

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

function PasswordModal({ action, onConfirm, onCancel, tokens }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) { onConfirm(); }
    else {
      setError(true); setInput('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(4px)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div style={{
        background: '#0d0d12',
        border: `1px solid ${error ? 'var(--cyber-red)' : 'rgba(129,140,248,0.3)'}`,
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        padding: 24, width: '100%', maxWidth: 360,
        boxShadow: error
          ? '0 0 30px rgba(255,0,51,0.3)'
          : '0 0 30px rgba(129,140,248,0.15)',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Lock size={16} style={{ color: 'var(--cyber-accent)', flexShrink: 0 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'var(--cyber-accent)', margin: 0, textTransform: 'uppercase' }}>
            Podaj hasło admina
          </h3>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cyber-text-dim)', marginBottom: 16 }}>
          {'>'} {action}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password" value={input} onChange={e => setInput(e.target.value)}
            placeholder="// ACCESS CODE..." autoFocus
            className="cyber-input"
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: '0.8rem', fontFamily: 'var(--font-mono)',
              border: `1px solid ${error ? 'var(--cyber-red)' : '#2a2a2a'}`,
              clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
              boxShadow: error ? '0 0 12px rgba(255,0,51,0.3)' : 'none',
            }}
          />
          {error && (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.66rem', letterSpacing: '0.15em', color: 'var(--cyber-red)', textAlign: 'center' }}>
              ⚠ ❌ Złe hasło
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="cyber-button-yellow" style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={14} /> POTWIERDŹ
            </button>
            <button type="button" onClick={onCancel} className="cyber-button-outline" style={{ flex: 1, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <X size={14} /> ANULUJ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Terminal log entry
function LogEntry({ row, onEdit, onDelete }) {
  const time = new Date(row.datePlayed).getTime();
  return (
    <div className="scan-hover" style={{
      background: '#07070b', border: '1px solid #14142a',
      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
      padding: '12px 14px', marginBottom: 4,
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a2a'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#141414'}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Top row: date + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Terminal prompt */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cyber-green)', opacity: 0.6 }}>{'>'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--cyber-green)' }}>
              SESSION_{String(row.id).slice(-4).toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cyber-text-dim)' }}>
              {formatDate(row.datePlayed)}
            </span>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onEdit(row)} style={{
              padding: '5px 8px', background: 'transparent',
              border: '1px solid #2a2a2a', cursor: 'pointer',
              color: 'var(--cyber-text-dim)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.4)'; e.currentTarget.style.color = 'var(--cyber-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = 'var(--cyber-text-dim)'; }}
            >
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete(row.id)} style={{
              padding: '5px 8px', background: 'transparent',
              border: '1px solid #2a2a2a', cursor: 'pointer',
              color: 'var(--cyber-text-dim)',
              clipPath: 'polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,0,51,0.4)'; e.currentTarget.style.color = 'var(--cyber-red)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = 'var(--cyber-text-dim)'; }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Data row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, paddingLeft: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.18em', color: 'var(--cyber-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>KOSZT</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyber-accent)', textShadow: '0 0 8px rgba(129,140,248,0.3)' }}>
              {formatAmount(row.totalCost)}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.18em', color: 'var(--cyber-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>NA OSOBĘ</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--cyber-cyan)' }}>
              {formatAmount(row.costPerPerson)}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.18em', color: 'var(--cyber-text-dim)', marginBottom: 2, textTransform: 'uppercase' }}>
              OBECNI ({row.presentPlayers.length})
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.presentPlayers.join(', ')}
            </p>
            {row.multisportPlayers.length > 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--cyber-green)', opacity: 0.7 }}>
                ⚡ {row.multisportPlayers.join(', ')}
              </p>
            )}
          </div>
        </div>
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
  const tokens = useThemeTokens();
  const { showError } = useToast();

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

  const grouped = groupHistoryByMonth(history);

  return (
    <>
      {pwModal && (
        <PasswordModal
          tokens={tokens}
          action={pwModal.type === 'edit' ? 'Podaj kod dostępu aby edytować sesję.' : 'Podaj kod dostępu aby usunąć sesję.'}
          onConfirm={handlePasswordConfirm}
          onCancel={() => setPwModal(null)}
        />
      )}

      <div className="cyber-box" style={{
        clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)',
        padding: '20px 18px',
        animation: 'slide-in-up 0.3s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 14, borderBottom: '1px solid #1a1a2e' }}>
          <div style={{ padding: '6px 8px', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>
            <Terminal size={14} style={{ color: 'var(--cyber-green)', display: 'block' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cyber-green)' }}>
            Historia sesji ping-ponga
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(0,255,65,0.2), transparent)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--cyber-text-dim)' }}>
            {history.length} REKORDÓW
          </span>
        </div>

        {/* Boot text */}
        <div style={{ marginBottom: 20, padding: '10px 14px', background: '#060609', border: '1px solid #0f0f0f' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--cyber-green)', lineHeight: 1.6, opacity: 0.7 }}>
            {'>'} System OK<br/>
            {'>'} Ładowanie historii...<br/>
            {'>'} {history.length} rekordów znaleziono<br/>
            {'>'} Dostęp przyznany<span style={{ animation: 'blink-cursor 1s step-end infinite', color: 'var(--cyber-green)' }}>▮</span>
          </p>
        </div>

        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <CalendarDays style={{ margin: '0 auto 16px', color: 'var(--cyber-text-dim)' }} size={40} />
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>
              BRAK DANYCH
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#333', marginTop: 8 }}>
              {'>'} Dodaj pierwszą sesję w zakładce LOG_
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {grouped.map(({ label, rows }) => (
            <div key={label}>
              {/* Month header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#08080d', border: '1px solid #1a1a2e', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.66rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cyber-accent)' }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#3a3a3a' }}>[{rows.length}x]</span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, rgba(129,140,248,0.15), transparent)' }} />
              </div>

              {/* Log entries */}
              <div>
                {rows.map((row) => {
                  const isEditingRow  = editingId  === row.id;
                  const isDeletingRow = deletingId === row.id;

                  if (isEditingRow) return (
                    <div key={row.id} style={{
                      background: '#08080d', border: '1px solid rgba(129,140,248,0.25)',
                      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
                      padding: 16, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 14,
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.18em', color: 'var(--cyber-accent)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>DATA</label>
                          <EditDateInput value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
                        </div>
                        <div>
                          <label style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.18em', color: 'var(--cyber-accent)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>KOSZT</label>
                          <input type="number" value={editForm.cost}
                            onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))}
                            className="cyber-input"
                            style={{ width: '100%', padding: '10px 12px', fontSize: '0.8rem', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                          />
                        </div>
                      </div>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: '#888', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
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
                                  borderColor: 'rgba(129,140,248,0.5)', background: 'rgba(129,140,248,0.08)', color: 'var(--cyber-accent)',
                                } : {
                                  borderColor: '#1a1a1a', background: 'transparent', color: '#444',
                                }),
                              }}>
                              {name}
                            </button>
                          ))}
                        </div>
                      </div>
                      {editForm.present?.length > 0 && (
                        <div>
                          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--cyber-green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase' }}>
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
                                    borderColor: 'rgba(0,255,65,0.5)', background: 'rgba(0,255,65,0.07)', color: 'var(--cyber-green)',
                                  } : {
                                    borderColor: '#1a1a1a', background: 'transparent', color: '#444',
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
                      background: 'rgba(255,0,51,0.04)', border: '1px solid rgba(255,0,51,0.35)',
                      clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
                      padding: 16, marginBottom: 4,
                      boxShadow: '0 0 20px rgba(255,0,51,0.1)',
                    }}>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: '0.12em', color: 'var(--cyber-red)', marginBottom: 4, textTransform: 'uppercase' }}>
                        ⚠ Usunąć sesję z dnia {formatDate(row.datePlayed)}?
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#444', marginBottom: 14 }}>
                        Ta operacja jest nieodwracalna.
                      </p>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleDelete(row.id)} disabled={isDeleting === row.id}
                          style={{
                            flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            background: 'var(--cyber-red)', color: '#000',
                            fontFamily: 'var(--font-display)', fontSize: '0.62rem', letterSpacing: '0.12em',
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
