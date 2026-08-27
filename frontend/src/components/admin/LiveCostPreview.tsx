import { Calculator } from 'lucide-react';
import { MULTISPORT_DISCOUNT, SPORT_LABEL, SPORT_EMOJI } from '@/constants';
import { formatAmountShort, parseAmount } from '@/utils/format';
import { getSessionShares, getShareGroups } from '@/utils/sessionCost';
import ShareBreakdown from '../common/ShareBreakdown';
import type { Sport } from '@/types/domain';
import { CLIP } from '@/constants/styles';

interface LiveCostPreviewProps {
  totalCost: string;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  racketCount?: number;
}

export default function LiveCostPreview({ totalCost, presentPlayers, multisportPlayers, sport, racketCost = 0, ownRacketPlayers = [], racketCount = 0 }: LiveCostPreviewProps) {
  const courtCost = parseAmount(totalCost);
  if (!totalCost || isNaN(courtCost) || courtCost <= 0 || presentPlayers.length === 0) return null;

  // Dokładnie ten sam podział, który trafi do bazy i sald graczy. Podgląd nie
  // liczy własnym wzorem, bo wtedy potrafił pokazać stawki, które nie sumowały
  // się do kwoty zapłaconej w recepcji.
  const session = {
    totalCost: courtCost + racketCost,
    racketCost,
    presentPlayers,
    multisportPlayers,
    ownRacketPlayers,
  };
  const { discountCapped } = getSessionShares(session);
  const groups = getShareGroups(session);
  const hasRackets = racketCost > 0;
  const racketEmoji = SPORT_EMOJI[sport] ?? '🎾';

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--co-tint)',
      border: '1px solid var(--co-tint-line)',
      clipPath: CLIP.tag,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Calculator size={14} style={{ color: 'var(--co-dim)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.18em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
          Podział kosztów · {SPORT_LABEL[sport] ?? 'Ping-Pong'}
        </span>
        {hasRackets && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-cyan)', marginLeft: 'auto' }}>
            Σ {formatAmountShort(courtCost + racketCost)} zł
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ShareBreakdown groups={groups} sportEmoji={racketEmoji} />
        {discountCapped && (
          <div role="status" style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-amber)', borderTop: '1px solid var(--co-border)', paddingTop: 4 }}>
            {'>'} ⚠ Karty nie zbiły ceny o pełne {MULTISPORT_DISCOUNT} zł — udział na osobę wychodzi mniejszy niż zniżka. Sprawdź, czy kwota się zgadza.
          </div>
        )}
        {hasRackets && (
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--co-dim)', borderTop: '1px solid var(--co-border)', paddingTop: 4 }}>
            {'>'} Kort: {formatAmountShort(courtCost)} zł · Rakiety ({racketCount} szt.): {formatAmountShort(racketCost)} zł
          </div>
        )}
      </div>
    </div>
  );
}
