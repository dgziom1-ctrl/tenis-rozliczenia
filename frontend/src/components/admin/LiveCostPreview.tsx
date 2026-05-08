import { Calculator } from 'lucide-react';
import { SPORT, SQUASH_MULTISPORT_DISCOUNT } from '@/constants';
import { formatAmountShort } from '@/utils/format';
import type { Sport } from '@/types/domain';

interface LiveCostPreviewProps {
  totalCost: string;
  presentPlayers: string[];
  multisportPlayers: string[];
  sport: Sport;
  racketCost?: number;
  ownRacketPlayers?: string[];
  racketCount?: number;
}

function fmt(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default function LiveCostPreview({ totalCost, presentPlayers, multisportPlayers, sport, racketCost = 0, ownRacketPlayers = [], racketCount = 0 }: LiveCostPreviewProps) {
  const courtCost = parseFloat(totalCost);
  if (!totalCost || isNaN(courtCost) || courtCost <= 0 || presentPlayers.length === 0) return null;

  const isSquash = sport === SPORT.SQUASH;

  if (isSquash) {
    const multiInPresent = multisportPlayers.filter(p => presentPlayers.includes(p));
    const multiCount = multiInPresent.length;
    const hypothetical = courtCost + multiCount * SQUASH_MULTISPORT_DISCOUNT;
    const base = hypothetical / presentPlayers.length;
    const discounted = Math.max(0, base - SQUASH_MULTISPORT_DISCOUNT);

    const ownRacketPresent = ownRacketPlayers.filter(p => presentPlayers.includes(p));
    const rentingPlayers = presentPlayers.filter(p => !ownRacketPresent.includes(p));
    const racketShare = racketCost > 0 && rentingPlayers.length > 0
      ? racketCost / rentingPlayers.length
      : 0;
    const hasRackets = racketCost > 0;

    // 4 grupy: bez karty + wypożycza, z kartą + wypożycza, bez karty + własna, z kartą + własna
    const nonMultiRenters = rentingPlayers.filter(p => !multisportPlayers.includes(p));
    const multiRenters = rentingPlayers.filter(p => multisportPlayers.includes(p));
    const nonMultiOwn = ownRacketPresent.filter(p => !multisportPlayers.includes(p));
    const multiOwn = ownRacketPresent.filter(p => multisportPlayers.includes(p));

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
          {hasRackets && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-cyan)', marginLeft: 'auto' }}>
              Σ {formatAmountShort(courtCost + racketCost)} zł
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nonMultiRenters.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-dim)', letterSpacing: '0.1em' }}>
                Bez karty ({nonMultiRenters.length} os.)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-cyan)' }}>
                {fmt(base + racketShare)} ZŁ
              </span>
            </div>
          )}
          {multiRenters.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-green)', letterSpacing: '0.1em' }}>
                ⚡ Cena z kartą ({multiRenters.length} os.)
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-green)' }}>
                {fmt(discounted + racketShare)} ZŁ
              </span>
            </div>
          )}
          {nonMultiOwn.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-amber)', letterSpacing: '0.1em' }}>
                🎾 {nonMultiOwn.join(', ')} — własna rakietka
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-amber)' }}>
                {fmt(base)} ZŁ
              </span>
            </div>
          )}
          {multiOwn.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--co-green)', letterSpacing: '0.1em' }}>
                ⚡🎾 {multiOwn.join(', ')} — karta + własna
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--co-green)' }}>
                {fmt(discounted)} ZŁ
              </span>
            </div>
          )}
          {hasRackets && (
            <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--co-dim)', borderTop: '1px solid var(--co-border)', paddingTop: 4 }}>
              {'>'} Kort: {formatAmountShort(courtCost)} zł · Rakiety ({racketCount} szt.): {formatAmountShort(racketCost)} zł
            </div>
          )}
        </div>
      </div>
    );
  }

  const paying    = presentPlayers.filter(p => !multisportPlayers.includes(p));
  const perPerson = paying.length > 0 ? courtCost / paying.length : 0;

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
