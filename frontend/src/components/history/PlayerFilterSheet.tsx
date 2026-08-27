import { Filter } from 'lucide-react';
import Modal from '../common/Modal';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';

interface PlayerFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  playerNames: string[];
  filterPlayer: string;
  onSelect: (name: string) => void;
}

export default function PlayerFilterSheet({ isOpen, onClose, playerNames, filterPlayer, onSelect }: PlayerFilterSheetProps) {
  if (!isOpen) return null;

  const rows = ['', ...(playerNames ?? [])];

  return (
    <Modal onClose={onClose} title="Filtr gracza" icon={Filter} align="bottom" maxWidth={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(name => {
          const selected = filterPlayer === name;
          return (
            <button
              key={name || '__all__'}
              onClick={() => { onSelect(name); onClose(); }}
              aria-pressed={selected}
              style={{
                width: '100%',
                // 44px to minimalny sensowny cel dotykowy — wcześniej wiersze
                // miały ok. 28px, a przycisk zamknięcia jeszcze mniej.
                minHeight: 44,
                padding: '10px 14px',
                cursor: 'pointer',
                border: `1px solid ${selected ? 'var(--co-tint-line)' : 'var(--co-border)'}`,
                background: selected ? 'var(--co-tint-hi)' : 'transparent',
                color: selected ? 'var(--co-cyan)' : 'var(--co-text)',
                clipPath: CLIP.tag,
                ...FONT.display(TEXT.base, TRACK.normal),
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                textAlign: 'left',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name || 'Wszyscy'}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
