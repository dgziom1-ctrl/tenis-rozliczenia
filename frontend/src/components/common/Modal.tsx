import { useRef, useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { FONT, TEXT, TRACK } from '@/constants/styles';

/**
 * Wspólna nakładka dla wszystkich dialogów.
 *
 * Powstała, bo siedem okien budowało ją osobno i każde inaczej: pięć różnych
 * z-indexów, dwa języki narożników (ścięte vs zaokrąglone), trzy animacje
 * wejścia, dwa rodzaje przycisku zamknięcia i ani jedna blokada przewijania
 * strony pod spodem. Rozmycie tła celowo zostaje na `::before` w CSS —
 * `backdrop-filter` postawiony wprost na nakładce sprawia, że na iOS Safari
 * przyciski w środku przestają reagować na dotyk.
 */

type ModalAlign = 'center' | 'bottom';

interface ModalProps {
  onClose: () => void;
  /** Tekst nagłówka. Pomiń razem z `icon`, żeby zbudować własną szapkę w `children`. */
  title?: string;
  icon?: LucideIcon;
  /** Kolor akcentu nagłówka — domyślnie główny akcent motywu. */
  accent?: string;
  align?: ModalAlign;
  maxWidth?: number;
  /** Dolne arkusze wjeżdżają od dołu, dialogi wyskakują na środku. */
  children: ReactNode;
  /** Pasek akcji przyklejony do dołu panelu; nie przewija się z treścią. */
  footer?: ReactNode;
  /** Kliknięcie w tło zamyka okno. Wyłącz tam, gdzie łatwo zgubić wpisane dane. */
  closeOnBackdrop?: boolean;
  /** Nakładka bez własnego paddingu i panelu — dla ekranów pełnoekranowych. */
  bare?: boolean;
  /** Etykieta dla czytników ekranu, gdy okno nie ma widocznego tytułu. */
  ariaLabel?: string;
}

export default function Modal({
  onClose,
  title,
  icon: Icon,
  accent = 'var(--co-cyan)',
  align = 'center',
  maxWidth = 420,
  children,
  footer,
  closeOnBackdrop = true,
  bare = false,
  ariaLabel,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(overlayRef);

  // Bez tego strona przewija się pod otwartym oknem. Zapamiętujemy poprzednią
  // wartość, żeby dwa nałożone dialogi nie odblokowały przewijania za wcześnie.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Nazwy klas wprost, a nie składane z szablonu — inaczej `lint:css` widzi je
  // jako nieużywane i nie potrafi wyłapać, gdy naprawdę obumrą.
  const alignClass = align === 'bottom' ? 'align-bottom' : 'align-center';

  const overlay = (
    <div
      ref={overlayRef}
      className={`modal-overlay ${alignClass}`}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : ariaLabel}
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      onClick={closeOnBackdrop ? e => { if (e.target === e.currentTarget) onClose(); } : undefined}
    >
      {bare ? children : (
        <div
          className={`modal-panel cut-corners ${align === 'bottom' ? 'sheet bottom-sheet-enter' : 'modal-enter'}`}
          style={{ maxWidth }}
        >
          {title && (
            <div className="modal-head">
              {Icon && <Icon size={16} style={{ color: accent, flexShrink: 0 }} aria-hidden="true" />}
              <h2 id={titleId} style={{ ...FONT.display(TEXT.lead, TRACK.normal), color: accent, margin: 0, flex: 1 }}>
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="modal-close-btn icon-btn"
                aria-label="Zamknij"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, flexShrink: 0,
                  marginRight: -10,
                  background: 'transparent', border: 'none',
                  color: 'var(--co-dim)', cursor: 'pointer',
                }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-foot">{footer}</div>}
        </div>
      )}
    </div>
  );

  // Portal, żeby `overflow: hidden` i `clip-path` kart nie ucinały okna.
  return createPortal(overlay, document.body);
}
