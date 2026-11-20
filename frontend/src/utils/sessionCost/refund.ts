import { MULTISPORT_DISCOUNT } from '@/constants';
import { toGrosze, toZloty } from '../money';
import { parseSession } from './session';
import type { SessionLike } from './session';
import { computeScanCredits } from './scanSplit';

/**
 * Zwrot za karty, jakiego spodziewamy się wg reguł (zł): zadziałane odbicia ×
 * zniżka. Tylko dla zasady `perScan` — to ona liczy odbicia godzina po godzinie.
 * Przy starszej zasadzie zwraca 0.
 */
export function getExpectedRefund(session: SessionLike): number {
  const parsed = parseSession({ ...session, discountModel: 'perScan' });
  return toZloty(computeScanCredits(parsed).effectiveScans * toGrosze(MULTISPORT_DISCOUNT));
}

/** Faktyczny zwrot (cena przed zwrotem − kort po zwrocie) w zł albo `null`, gdy sesja go nie zna. */
export function getCourtRefund(session: SessionLike): number | null {
  const parsed = parseSession(session);
  if (parsed.courtGrossGrosze === undefined) return null;
  return toZloty(parsed.courtGrossGrosze - (parsed.totalGrosze - parsed.racketGrosze));
}
