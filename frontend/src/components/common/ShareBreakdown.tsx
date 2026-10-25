import { Zap } from 'lucide-react';
import SportGlyph from './icons/SportGlyph';
import { formatAmount } from '@/utils/format';
import { TEXT, TRACK } from '@/constants/styles';
import type { ShareGroup } from '@/utils/sessionCost';

interface ShareBreakdownProps {
  /** Grupy z `getShareGroups` — stawki są już policzone przez silnik rozliczeń. */
  groups: ShareGroup[];
  /** Dyscyplina sesji — rysowana jako wektorowy znacznik, nie emoji. */
  sport?: string;
  size?: 'sm' | 'md';
}

type Marker = 'card' | 'racket' | 'card+racket' | null;

function describe(group: ShareGroup): { label: string; color: string; marker: Marker } {
  if (group.ownRacket) {
    return group.hasCard
      ? { label: 'karta + własna', color: 'var(--co-green)', marker: 'card+racket' }
      : { label: 'własna rakietka', color: 'var(--co-amber)', marker: 'racket' };
  }
  return group.hasCard
    ? { label: 'z kartą', color: 'var(--co-green)', marker: 'card' }
    : { label: 'bez karty', color: 'var(--co-cyan)', marker: null };
}

/**
 * Ile płaci każda grupa graczy — jeden wygląd dla podglądu przy dodawaniu,
 * wpisu w historii i formularza edycji, żeby te same dane nigdy nie wyglądały
 * na trzy różne sposoby.
 *
 * Znaczniki (karta MultiSport, własna rakietka) są ikonami wektorowymi:
 * wcześniej sklejały się w string „⚡🏸”, który raz czytał się jako jeden
 * znak, a raz jako dwa, i nie dawał się wyrównać do linii tekstu.
 */
export default function ShareBreakdown({ groups, sport = 'pingpong', size = 'md' }: ShareBreakdownProps) {
  const isSmall = size === 'sm';
  const iconSize = isSmall ? 11 : 12;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isSmall ? 3 : 5 }}>
      {groups.map(group => {
        const { label, color, marker } = describe(group);
        return (
          <div key={`${label}-${group.names.join('-')}`} title={group.names.join(', ')}
            style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            {/* Rozmiary jadą skalą TEXT. Wcześniej ten komponent — którego
                zadaniem jest, żeby te same dane nie wyglądały na trzy różne
                sposoby — wprowadzał cztery stopnie (0.72/0.8/0.85/1.1rem)
                nieistniejące nigdzie indziej w aplikacji. */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontFamily: 'var(--font-display)', letterSpacing: TRACK.normal, color,
              fontSize: isSmall ? TEXT.micro : TEXT.small, minWidth: 0,
            }}>
              {marker === 'card' && <Zap size={iconSize} aria-hidden="true" style={{ flexShrink: 0 }} />}
              {(marker === 'racket' || marker === 'card+racket') && (
                <SportGlyph sport={sport} size={iconSize} style={{ flexShrink: 0 }} />
              )}
              <span>
                {label}
                <span style={{ color: 'var(--co-dim)' }}> · {group.names.length} os.</span>
              </span>
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
