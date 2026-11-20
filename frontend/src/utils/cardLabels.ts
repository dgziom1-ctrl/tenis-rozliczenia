import type { CardKind, ShareGroup } from './sessionCost';

/**
 * Jedno słownictwo kart dla całej aplikacji: podgląd przy dodawaniu,
 * podsumowanie, historia, edycja i wiadomość na grupę mówią to samo.
 * Wcześniej Multisport bywał „kartą”, „z kartą” albo „ceną z kartą”, a obok
 * stał już Medicover — nie było wiadomo, o którą kartę chodzi.
 */
export const CARD_NAME: Record<CardKind, string> = {
  none: 'Bez karty',
  multi: 'Multisport',
  single: 'Medicover',
};

/** Znacznik karty w tekście (wiadomość na grupę). */
export const CARD_EMOJI: Record<CardKind, string> = {
  none: '💳',
  multi: '⚡',
  single: '🎟️',
};

/** Kolor grupy — Multisport zielony, Medicover bursztynowy, bez karty cyjan. */
export const CARD_COLOR: Record<CardKind, string> = {
  none: 'var(--co-cyan)',
  multi: 'var(--co-green)',
  single: 'var(--co-amber)',
};

/** Nazwa grupy płacącej tę samą stawkę, np. „Multisport + własna rakietka”. */
export function shareGroupLabel(group: Pick<ShareGroup, 'card' | 'ownRacket'>): string {
  if (!group.ownRacket) return CARD_NAME[group.card];
  return group.card === 'none' ? 'Własna rakietka' : `${CARD_NAME[group.card]} + własna rakietka`;
}

/**
 * Licznik kart w nagłówku sekcji: osobno Multisport i Medicover, np. „⚡3 🎟️1”.
 * Zwraca `undefined`, gdy nikt nie ma karty — wtedy nagłówek nie pokazuje licznika.
 */
export function cardCounter(multiCount: number, medicoverCount: number): string | undefined {
  const parts = [
    multiCount > 0 ? `${CARD_EMOJI.multi}${multiCount}` : null,
    medicoverCount > 0 ? `${CARD_EMOJI.single}${medicoverCount}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}
