import MedalGlyph from '../../common/icons/MedalGlyph';
import { CLIP, TEXT } from '@/constants/styles';
import type { WrappedStats } from '@/types/ui';
import { display, mono } from './styles';

const MEDAL_COLORS = ['var(--co-gold)', 'var(--co-silver)', 'var(--co-bronze)'];
const MEDAL_TINTS = ['var(--co-tint-gold)', 'var(--co-tint)', 'var(--co-tint-bronze)'];
const MEDAL_BORDERS = ['var(--co-gold)', 'var(--co-silver)', 'var(--co-bronze)'];

export default function RankingSlide({ stats }: { stats: WrappedStats }) {
  const top3 = stats.players.slice(0, 3);
  const rest = stats.players.slice(3);

  return (
    <div style={{ textAlign: 'center', maxWidth: 500, width: '100%' }}>
      <div style={{
        ...mono('clamp(0.65rem, 1.8vw, 0.75rem)', { letterSpacing: 'normal' }),
        color: 'var(--co-dim)', marginBottom: 24,
      }}>
        RANKING {stats.year}
      </div>

      {/* Podium */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(8px, 3vw, 20px)', marginBottom: 28 }}>
        {top3.map((p, i) => (
          <div key={p.name} style={{
            flex: 1, maxWidth: 140, padding: 'clamp(10px, 3vw, 18px) 8px',
            background: MEDAL_TINTS[i],
            border: `1px solid ${MEDAL_BORDERS[i]}`,
            clipPath: CLIP.card,
            animation: `wm-slideUp 0.6s ease-out ${0.15 * i}s both`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <MedalGlyph place={i + 1} size={26} />
            </div>
            <div style={{
              ...display('clamp(0.9rem, 3vw, 1.4rem)'),
              color: MEDAL_COLORS[i],
              textShadow: i === 0 ? 'var(--glow-gold-md)' : 'none',
              marginBottom: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.name}
            </div>
            <div style={{ ...mono('clamp(0.65rem, 1.8vw, 0.75rem)'), color: 'var(--co-text)' }}>
              {p.percentage}%
            </div>
            <div style={{ ...mono(TEXT.small), color: 'var(--co-dim)', marginTop: 2 }}>
              {p.attended} sesji
            </div>
          </div>
        ))}
      </div>

      {/* Rest of players */}
      {rest.length > 0 && (
        <div style={{
          textAlign: 'left', padding: '10px 14px',
          background: 'var(--co-surface-2)',
          border: '1px solid var(--co-border)',
          maxHeight: 180, overflowY: 'auto', overscrollBehavior: 'contain',
        }} data-modal-scroll>
          {rest.map((p) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 0',
              borderBottom: '1px solid var(--co-separator)',
            }}>
              <span style={{ ...mono(TEXT.small), color: 'var(--co-dim)', width: 24 }}>
                #{p.place}
              </span>
              <span style={{ ...mono('clamp(0.6rem, 2vw, 0.8rem)'), color: 'var(--co-text)', flex: 1 }}>
                {p.name}
              </span>
              <span style={{ ...mono(TEXT.small), color: 'var(--co-cyan)' }}>
                {p.percentage}%
              </span>
              <span style={{ ...mono(TEXT.small), color: 'var(--co-dim)', width: 50, textAlign: 'right' }}>
                {p.attended} sesji
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
