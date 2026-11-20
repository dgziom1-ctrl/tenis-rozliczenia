import { useEffect, useRef, useState } from 'react';
import { CircleHelp, CheckCircle2, HandCoins, Copy, Check } from 'lucide-react';
import Modal from './Modal';
import { useToast } from './Toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BLIK_NUMBER } from '@/utils/blik';
import { copyToClipboard } from '@/utils/clipboard';
import { track } from '@/lib/analytics/track';
import { FONT, TEXT } from '@/constants/styles';

interface FirstRunGuideProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Krótkie wprowadzenie dla nowej osoby.
 *
 * Aplikacja pokazuje kwoty, statusy i role bez legendy — a „ROZLICZONY” znaczy
 * tu „odhaczone w aplikacji”, nie „przelane w banku”. Ten dialog mówi to wprost,
 * pokazuje kolejność (kwota → BLIK → odhaczenie) i uczy gestu przytrzymania,
 * zanim użytkownik dotknie pierwszej kwoty.
 * Można go otworzyć ponownie przyciskiem „?” w nagłówku.
 */
export default function FirstRunGuide({ open, onClose }: FirstRunGuideProps) {
  const isMobile = useIsMobile();
  const { showError, showSuccess } = useToast();
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(copiedTimer.current ?? undefined), []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(BLIK_NUMBER.replace(/\s/g, ''));
    if (ok) {
      track('blik_copy', { from: 'guide' });
      setCopied(true);
      showSuccess('Numer BLIK skopiowany');
      clearTimeout(copiedTimer.current ?? undefined);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      showError('Nie udało się skopiować numeru BLIK');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Jak to działa?"
      icon={CircleHelp}
      align={isMobile ? 'bottom' : 'center'}
      maxWidth={460}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="cyber-button-yellow"
          style={{ width: '100%', minHeight: 44, padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <CheckCircle2 size={15} aria-hidden="true" /> Jasne, gramy!
        </button>
      }
    >
      <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', margin: '0 0 14px', lineHeight: 1.6 }}>
        Tu zapisujemy, kto grał i jak dzielimy koszty kortu. <strong style={{ color: 'var(--co-cyan)' }}>Aplikacja niczego sama nie przelewa</strong> — to nasz wspólny notes.
      </p>

      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-text)' }}>Kamil</strong> rezerwuje i opłaca kort, potem dzielimy koszt na wszystkich. Na swojej karcie widzisz swoją część.
        </li>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-rose)' }}>Zaległość</strong> to Twoja część, która czeka na oddanie.
          {' '}<strong style={{ color: 'var(--co-green)' }}>Rozliczony</strong> znaczy, że wpłata jest odhaczona w aplikacji — sam przelew robisz w banku.
        </li>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-text)' }}>Dodaj</strong> zapisuje granie, <strong style={{ color: 'var(--co-text)' }}>Ranking</strong> pokazuje, kto najczęściej wpada na kort, a w <strong style={{ color: 'var(--co-text)' }}>Historii</strong> są wszystkie wpisy.
        </li>
      </ul>

      <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)' }}>
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: 0, lineHeight: 1.5 }}>
          Swoją część wyślij w banku <strong style={{ color: 'var(--co-text)' }}>przelewem na telefon BLIK</strong> na numer:
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <p style={{ ...FONT.mono(TEXT.base), color: 'var(--co-cyan)', margin: 0, letterSpacing: 'normal' }}>
            {BLIK_NUMBER}
          </p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="cyber-button-outline"
            aria-label={copied ? 'Numer BLIK skopiowany' : `Skopiuj numer BLIK ${BLIK_NUMBER}`}
            style={{ minHeight: 44, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, color: copied ? 'var(--co-green)' : undefined }}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            {copied ? 'Skopiowano' : 'Kopiuj'}
          </button>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: '12px 14px',
        background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)',
        borderLeft: '3px solid var(--co-amber)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <HandCoins size={18} aria-hidden="true" style={{ color: 'var(--co-amber)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ ...FONT.display(TEXT.small), color: 'var(--co-amber)', margin: 0 }}>
            Gdy BLIK poszedł, przytrzymaj przycisk z kwotą
          </p>
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '4px 0 0', lineHeight: 1.55 }}>
            Przytrzymaj ok. 0,8 s, aż pasek się zapełni — dzięki temu nic nie odhaczy się przez przypadek.
          </p>
        </div>
      </div>

      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '14px 0 0', lineHeight: 1.5 }}>
        Ten przewodnik zawsze otworzysz przyciskiem „?” w nagłówku.
      </p>
    </Modal>
  );
}
