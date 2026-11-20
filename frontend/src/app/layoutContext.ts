import { useOutletContext } from 'react-router';
import type { SoundType } from '@/types/ui';

/**
 * To, co `Layout` przekazuje zakładkom przez `<Outlet context>`.
 *
 * Jeden typ i jeden hook zamiast powtarzanego w każdej stronie
 * `useOutletContext<{ playSound: … }>()` — dopisanie pola do kontekstu nie
 * wymaga wtedy synchronizowania pięciu kopii tej samej deklaracji.
 */
export interface LayoutContext {
  playSound: (type: SoundType) => void;
}

export function useLayoutContext(): LayoutContext {
  return useOutletContext<LayoutContext>();
}
