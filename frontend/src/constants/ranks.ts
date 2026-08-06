import type { Rank } from '@/types/ui';

export const RANKS: Rank[] = [
  { min: 90, emoji: '🏆', name: 'LEGENDA',  color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-600', hex: '#FFD700' },
  { min: 75, emoji: '⭐',  name: 'MISTRZ',   color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-700', hex: '#FF2090' },
  { min: 60, emoji: '🎖️', name: 'WETERAN',  color: 'text-violet-400', bg: 'bg-violet-950/40', border: 'border-violet-700', hex: '#7B8FFF' },
  { min: 45, emoji: '🔥', name: 'STAŁY',    color: 'text-rose-400',   bg: 'bg-rose-950/40',   border: 'border-rose-800',   hex: '#00E5FF' },
  { min: 20, emoji: '👀', name: 'GOŚĆ',     color: 'text-slate-400',  bg: 'bg-slate-900/40',  border: 'border-slate-700',  hex: '#8899AA' },
  { min:  0, emoji: '👻', name: 'DUCH',     color: 'text-slate-500',  bg: 'bg-slate-900/40',  border: 'border-slate-700',  hex: '#556677' },
];

export function getRank(pct: number): Rank {
  return RANKS.find(r => pct >= r.min) ?? RANKS[RANKS.length - 1];
}

export const PODIUM_ORDER = [2, 1, 3] as const;
