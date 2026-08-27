import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { SPORT_EMOJI, SPORT_LABEL, hasRacketRental } from '@/constants';
import { useToast } from '../common/Toast';
import { formatDate, formatAmountShort } from '@/utils/format';
import { buildGroupMessage } from '@/utils/message';
import { getShareGroups } from '@/utils/sessionCost';
import { copyToClipboard } from '@/utils/clipboard';
import Modal from '../common/Modal';
import { FONT, TEXT, TRACK, CLIP } from '@/constants/styles';
import type { Sport } from '@/types/domain';

interface SessionSummary {
  date: string;
  totalCost: number;
  sport: Sport;
  presentPlayers: string[];
  multisportPlayers: string[];
  racketCost: number;
  ownRacketPlayers: string[];
}

interface SessionSummaryModalProps {
  /** Komponent montuje się dopiero razem z podsumowaniem — patrz AdminTab. */
  summary: SessionSummary;
  onClose: () => void;
}

const COPIED_RESET_MS = 2500;

export default function SessionSummaryModal({ summary, onClose }: SessionSummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const { showError } = useToast();
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const { date, totalCost, presentPlayers, multisportPlayers, sport, racketCost, ownRacketPlayers } = summary;
  const withRackets = hasRacketRental(sport);
  const hasRackets = withRackets && racketCost > 0;
  const presentCount = presentPlayers.length;
  // Te same grupy i stawki co w podglądzie oraz w wiadomości na grupę.
  const groups = getShareGroups({ totalCost, racketCost, presentPlayers, multisportPlayers, ownRacketPlayers });
  const headline = groups[0];

  const handleCopy = async () => {
    const msg = buildGroupMessage({ date, totalCost, presentPlayers, multisportPlayers, sport, racketCost, ownRacketPlayers });
    if (await copyToClipboard(msg)) {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } else {
      showError('Nie udało się skopiować tekstu');
    }
  };

  return (
    <Modal
      onClose={onClose}
      title="Sesja zapisana"
      icon={CheckCircle2}
      accent="var(--co-green)"
      maxWidth={420}
      footer={
        <>
          <button
            onClick={handleCopy}
            aria-live="polite"
            className={copied ? 'cyber-button-yellow' : 'cyber-button-outline'}
            style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {copied ? <><CheckCircle2 size={14} aria-hidden="true" /> Skopiowano!</> : <><Copy size={14} aria-hidden="true" /> Kopiuj na grupkę</>}
          </button>
          <button onClick={onClose} className="cyber-button-yellow" style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            OK
          </button>
        </>
      }
    >
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'SPORT', value: `${SPORT_EMOJI[sport] ?? '🏓'} ${(SPORT_LABEL[sport] ?? 'Ping-Pong').toUpperCase()}`, color: withRackets ? 'var(--co-green)' : 'var(--co-cyan)' },
          { label: 'DATA', value: formatDate(date), color: 'var(--co-text)' },
          { label: 'KOSZT', value: `${formatAmountShort(totalCost)} ZŁ`, color: 'var(--co-cyan)' },
          { label: 'OBECNI', value: presentCount, color: 'var(--co-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: '10px 12px', background: 'var(--co-surface-2)',
            border: '1px solid var(--co-border)',
            clipPath: CLIP.badge,
          }}>
            <p style={{ ...FONT.monoLabel, marginBottom: 4 }}>{label}</p>
            <p style={{ ...FONT.mono(TEXT.base), color, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-person */}
      {headline && (
        <div style={{
          padding: '16px', textAlign: 'center',
          background: 'var(--co-tint)',
          border: '1px solid var(--co-tint-line)',
          clipPath: CLIP.smallCard,
        }}>
          <p style={{ ...FONT.monoLabel, marginBottom: 6 }}>PODZIAŁ KOSZTÓW</p>
          <p style={{ ...FONT.mono(TEXT.h2), color: 'var(--co-cyan)', textShadow: 'var(--glow-cyan-lg)', margin: 0 }}>
            {formatAmountShort(headline.perPerson)}
            <span style={{ fontSize: TEXT.base, opacity: 0.5, marginLeft: 4 }}>ZŁ / OS.</span>
          </p>
          {/* Kwoty, które ktoś ma realnie zapłacić — wcześniej 9,6px. */}
          {groups.slice(1).map(group => (
            <p key={group.names.join()} style={{
              ...FONT.mono(TEXT.small), marginTop: 4,
              color: group.hasCard ? 'var(--co-green)' : 'var(--co-amber)',
            }}>
              {group.hasCard ? '⚡' : SPORT_EMOJI[sport]} {group.names.join(', ')}
              {group.ownRacket ? ' (własna rakietka)' : ''}: {formatAmountShort(group.perPerson)} zł
            </p>
          ))}
          {hasRackets && (
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', marginTop: 6, letterSpacing: TRACK.tight }}>
              Kort: {formatAmountShort(totalCost - racketCost)} zł · Rakiety: {formatAmountShort(racketCost)} zł
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
