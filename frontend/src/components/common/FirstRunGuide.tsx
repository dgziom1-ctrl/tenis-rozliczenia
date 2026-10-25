import { CircleHelp, CheckCircle2, HandCoins } from 'lucide-react';
import Modal from './Modal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { BLIK_NUMBER } from '@/utils/blik';
import { FONT, TEXT, TRACK } from '@/constants/styles';

interface FirstRunGuideProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Krótkie wprowadzenie dla nowej osoby.
 *
 * Aplikacja pokazuje kwoty, statusy i role bez legendy — a „ROZLICZONY” znaczy
 * tu „wpisane w aplikacji”, nie „przelane w banku”. Ten dialog mówi to wprost
 * i uczy gestu przytrzymania, zanim użytkownik dotknie pierwszej kwoty.
 * Można go otworzyć ponownie przyciskiem „?” w nagłówku.
 */
export default function FirstRunGuide({ open, onClose }: FirstRunGuideProps) {
  const isMobile = useIsMobile();

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
          <CheckCircle2 size={15} aria-hidden="true" /> Zaczynam
        </button>
      }
    >
      <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', margin: '0 0 14px', lineHeight: 1.6 }}>
        CYBER-PONK prowadzi rozliczenia kortu. <strong style={{ color: 'var(--co-cyan)' }}>Nie wykonuje przelewów.</strong>
      </p>

      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-text)' }}>Kamil (skarbnik)</strong> wykłada za kort. Twoja karta pokazuje, ile masz mu oddać.
        </li>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-rose)' }}>Zaległość</strong> to kwota do wpłaty.
          {' '}<strong style={{ color: 'var(--co-green)' }}>Rozliczony</strong> znaczy, że wpłata została zapisana w aplikacji — nie że pieniądze już doszły.
        </li>
        <li style={{ ...FONT.mono(TEXT.small), color: 'var(--co-dim)', lineHeight: 1.55 }}>
          <strong style={{ color: 'var(--co-text)' }}>Dodaj</strong> zapisuje sesję, a <strong style={{ color: 'var(--co-text)' }}>Ranking</strong> liczy obecność. W Historii znajdziesz wszystkie wpisy.
        </li>
      </ul>

      <div style={{
        marginTop: 16, padding: '12px 14px',
        background: 'var(--co-tint)', border: '1px solid var(--co-tint-line)',
        borderLeft: '3px solid var(--co-amber)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <HandCoins size={18} aria-hidden="true" style={{ color: 'var(--co-amber)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ ...FONT.display(TEXT.small, TRACK.normal), color: 'var(--co-amber)', margin: 0 }}>
            Aby zapisać wpłatę, przytrzymaj przycisk z kwotą
          </p>
          <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '4px 0 0', lineHeight: 1.55 }}>
            Trzymaj ok. 0,8 s, aż pasek się zapełni. Krótkie dotknięcie nic nie zapisuje — to zabezpieczenie przed przypadkowym rozliczeniem.
          </p>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)' }}>
        <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: 0 }}>
          Przelew BLIK wykonujesz sam w banku na numer:
        </p>
        <p style={{ ...FONT.mono(TEXT.base), color: 'var(--co-cyan)', margin: '4px 0 0', letterSpacing: TRACK.normal }}>
          {BLIK_NUMBER}
        </p>
      </div>

      <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', margin: '14px 0 0', lineHeight: 1.5 }}>
        Do tego przewodnika wrócisz przyciskiem „?” w nagłówku.
      </p>
    </Modal>
  );
}
