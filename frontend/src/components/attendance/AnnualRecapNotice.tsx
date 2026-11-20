import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import Modal from '@/components/common/Modal';
import WrappedModal from './WrappedModal';
import { computeWrappedStats } from '@/utils/wrapped';
import { FONT, TEXT } from '@/constants/styles';
import type { HistoryEntry, PlayerStats } from '@/types/ui';

// Fallback na czas życia strony, gdy przeglądarka blokuje localStorage.
const seenInMemory = new Set<number>();
const storageKey = (year: number) => `cyberponk.annual-recap.${year}`;

interface AnnualRecapNoticeProps {
  history: HistoryEntry[];
  players: PlayerStats[];
  enabled: boolean;
}

/** Zaproszenie do podsumowania poprzedniego roku, niezależnie od zakładki. */
export default function AnnualRecapNotice({ history, players, enabled }: AnnualRecapNoticeProps) {
  const [noticeYear, setNoticeYear] = useState<number | null>(null);
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);
  const year = new Date().getFullYear() - 1;
  const hasSessions = history.some(session => session.datePlayed?.startsWith(`${year}-`));

  useEffect(() => {
    if (!enabled || !hasSessions || seenInMemory.has(year)) return;
    try {
      if (localStorage.getItem(storageKey(year)) === '1') return;
      // Zapis przy pokazaniu, nie przy zamknięciu: odświeżenie nie ponowi okienka.
      localStorage.setItem(storageKey(year), '1');
    } catch {
      // Bez storage zapobiegamy ponowieniu przynajmniej do przeładowania strony.
      seenInMemory.add(year);
    }
    setNoticeYear(year);
  }, [enabled, hasSessions, year]);

  const stats = wrappedYear === null ? null : computeWrappedStats(history, players, wrappedYear);

  return (
    <>
      {noticeYear !== null && (
        <Modal
          open
          onClose={() => setNoticeYear(null)}
          title={`Podsumowanie ${noticeYear} jest gotowe!`}
          icon={Film}
          maxWidth={460}
          footer={
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, width: '100%' }}>
              <button type="button" className="cyber-button-yellow" style={{ flex: '1 1 180px', minHeight: 44, padding: '11px 16px' }}
                onClick={() => { setWrappedYear(noticeYear); setNoticeYear(null); }}>
                Zobacz podsumowanie
              </button>
              <button type="button" className="cyber-button-outline" style={{ flex: '1 1 120px', minHeight: 44, padding: '11px 16px' }}
                onClick={() => setNoticeYear(null)}>
                Później
              </button>
            </div>
          }
        >
          <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', lineHeight: 1.6, margin: '0 0 12px' }}>
            Zobacz, jak graliśmy w {noticeYear} roku.
          </p>
          <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.6, margin: 0 }}>
            Jeśli zechcesz obejrzeć je ponownie, znajdziesz je w sekcji <strong style={{ color: 'var(--co-text)' }}>Ranking</strong> — jeśli widzisz wybór sezonu, wybierz {noticeYear}.
          </p>
        </Modal>
      )}
      {stats && <WrappedModal stats={stats} onClose={() => setWrappedYear(null)} />}
    </>
  );
}
