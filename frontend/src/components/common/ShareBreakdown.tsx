import { formatAmount } from '@/utils/format';
import type { ShareGroup } from '@/utils/sessionCost';

interface ShareBreakdownProps {
  /** Grupy z `getShareGroups` — stawki są już policzone przez silnik rozliczeń. */
  groups: ShareGroup[];
  sportEmoji: string;
  size?: 'sm' | 'md';
}

function describe(group: ShareGroup, sportEmoji: string): { label: string; color: string } {
  if (group.ownRacket) {
    return group.hasCard
      ? { label: `⚡${sportEmoji} karta + własna`, color: 'var(--co-green)' }
      : { label: `${sportEmoji} własna rakietka`, color: 'var(--co-amber)' };
  }
  return group.hasCard
    ? { label: '⚡ z kartą', color: 'var(--co-green)' }
    : { label: 'bez karty', color: 'var(--co-cyan)' };
}

/**
 * Ile płaci każda grupa graczy — jeden wygląd dla podglądu przy dodawaniu,
 * wpisu w historii i formularza edycji, żeby te same dane nigdy nie wyglądały
 * na trzy różne sposoby.
 */
export default function ShareBreakdown({ groups, sportEmoji, size = 'md' }: ShareBreakdownProps) {
  const isSmall = size === 'sm';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isSmall ? 3 : 5 }}>
      {groups.map(group => {
        const { label, color } = describe(group, sportEmoji);
        return (
          <div key={label} title={group.names.join(', ')}
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-display)', letterSpacing: '0.08em', color,
              fontSize: isSmall ? '0.72rem' : '0.8rem', minWidth: 0,
            }}>
              {label}
              <span style={{ color: 'var(--co-dim)' }}> · {group.names.length} os.</span>
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', color, whiteSpace: 'nowrap',
              fontSize: isSmall ? '0.85rem' : '1.1rem',
            }}>
              {formatAmount(group.perPerson)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
