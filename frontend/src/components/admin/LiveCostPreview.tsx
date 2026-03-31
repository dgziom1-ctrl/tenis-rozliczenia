import { Calculator } from 'lucide-react';
import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import { formatAmountShort } from '@/utils/format';
import type { Sport } from '@/types/domain';

interface LiveCostPreviewProps {
  totalCost: string;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport: Sport;
}

export default function LiveCostPreview({ totalCost, presentPlayers, multisportPlayers, sport }: LiveCostPreviewProps) {
  const cost = parseFloat(totalCost);
  if (!totalCost || isNaN(cost) || cost <= 0 || presentPlayers.length === 0) return null;

  const isSquash = sport === SPORT.SQUASH;

  if (isSquash) {
    const multiCount = multisportPlayers.filter(p => presentPlayers.includes(p)).length;
    const hypothetical = cost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    const base       = hypothetical / presentPlayers.length;
    const discounted = Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT);
    const hasMulti   = multisportPlayers.length > 0;
    return (
      <div style={{
        padding: '12px 16px',
        background: 'rgba(0,229,255,0.03)',
        border: '1px solid rgba(0,229,255,0.2)',
        clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Calculator size={14} style={{ color: 'var(--co-dim)' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.15em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
            Podział kosztów · Squash
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>
              Bez karty ({presentPlayers.length - multisportPlayers.filter(p => presentPlayers.includes(p)).length} os.)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-cyan)' }}>
              {(Math.round(base * 100) / 100).toFixed(2)} ZŁ
            </span>
          </div>
          {hasMulti && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-green)', letterSpacing: '0.1em' }}>
                ⚡ Cena z kartą ({multiCount} os.)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-green)' }}>
                {(Math.round(discounted * 100) / 100).toFixed(2)} ZŁ
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const paying    = presentPlayers.filter(p => !multisportPlayers.includes(p));
  const perPerson = paying.length > 0 ? cost / paying.length : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(0,229,255,0.03)',
      border: '1px solid rgba(0,229,255,0.2)',
      clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calculator size={14} style={{ color: 'var(--co-dim)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', letterSpacing: '0.15em', color: 'var(--co-dim)', textTransform: 'uppercase' }}>
          Podział kosztów
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        {paying.length > 0 ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--co-cyan)', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>
              {formatAmountShort(perPerson)} ZŁ
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--co-dim)', marginLeft: 8, letterSpacing: '0.12em' }}>
              / os. ({paying.length} PŁACI)
            </span>
          </>
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', letterSpacing: '0.1em', color: 'var(--co-green)' }}>
            ⚡ WSZYSCY MAJĄ MULTISPORT
          </span>
        )}
      </div>
    </div>
  );
}
