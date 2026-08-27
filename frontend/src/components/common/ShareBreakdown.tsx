import { formatAmount } from '@/utils/format';
import { TEXT, TRACK } from '@/constants/styles';
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
            {/* Rozmiary jadą skalą TEXT. Wcześniej ten komponent — którego
                zadaniem jest, żeby te same dane nie wyglądały na trzy różne
                sposoby — wprowadzał cztery stopnie (0.72/0.8/0.85/1.1rem)
                nieistniejące nigdzie indziej w aplikacji. */}
            <span style={{
              fontFamily: 'var(--font-display)', letterSpacing: TRACK.normal, color,
              fontSize: isSmall ? TEXT.micro : TEXT.small, minWidth: 0,
            }}>
              {label}
              <span style={{ color: 'var(--co-dim)' }}> · {group.names.length} os.</span>
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', color, whiteSpace: 'nowrap',
              fontSize: isSmall ? TEXT.base : TEXT.lead,
            }}>
              {formatAmount(group.perPerson)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
