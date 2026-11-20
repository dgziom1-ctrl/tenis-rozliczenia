import { useState, useId, useMemo } from 'react';
import type { FormEvent } from 'react';
import type { PlayerStats, SoundType } from '@/types/ui';
import { Users, UserPlus, Cpu, Trash2, RotateCcw, AlertTriangle, Zap, Ticket } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PlayerProfileCard from './PlayerProfileCard';
import { addPlayer, softDeletePlayer, restorePlayer, permanentDeletePlayer, setPlayerCard } from '@/lib/firebase';
import { SOUND_TYPES, ORGANIZER_NAME, MULTISPORT_DISCOUNT } from '@/constants';
import { CARD_EMOJI, CARD_NAME } from '@/utils/cardLabels';
import type { CardKind } from '@/utils/sessionCost';
import { createPlayerColorMap } from '@/constants/colors';
import { FONT, TEXT, CLIP, CONTENT_WIDTH } from '@/constants/styles';
import { MAX_PLAYER_NAME_LENGTH, hasForbiddenKeyChars, FORBIDDEN_NAME_CHARS_MESSAGE } from '@/utils/validation';
import { useToast } from '../common/Toast';
import { PasswordModal, SectionHeader, PanelHeader } from '../common/SharedUI';
import { InlineSpinner } from '../common/LoadingSkeleton';
import ToggleChip from '../common/ToggleChip';
import type { ToggleAccent } from '../common/ToggleChip';

/** Rodzaje kart do wyboru przy graczu: ten sam układ i ikony co w reszcie aplikacji. */
const CARD_CHOICES: { kind: CardKind; Icon: LucideIcon | null; accent: ToggleAccent }[] = [
  { kind: 'none', Icon: null, accent: 'cyan' },
  { kind: 'multi', Icon: Zap, accent: 'green' },
  { kind: 'single', Icon: Ticket, accent: 'amber' },
];

interface PlayersTabProps {
  players: PlayerStats[];
  deletedPlayers: string[];
  defaultMultiPlayers: string[];
  /** Gracze z Medicoverem — spośród graczy z kartą (`defaultMultiPlayers`). */
  singleScanPlayers?: string[];
  playSound: (type: SoundType) => void;
}

export default function PlayersTab({ players, deletedPlayers, defaultMultiPlayers, singleScanPlayers = [], playSound }: PlayersTabProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [pendingCard,   setPendingCard]   = useState<{ name: string; card: CardKind } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pwModal,       setPwModal]       = useState<string | null>(null);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [processingPlayer, setProcessingPlayer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const newPlayerId = useId();
  const nameErrorId = useId();
  const { showSuccess, showError } = useToast();

  // Karta gracza wynika z dwóch list w bazie: Medicover to znacznik jednorazowego
  // odbicia, a pozostali z „domyślną kartą” mają Multisport.
  const cardOf = (name: string): CardKind =>
    singleScanPlayers.includes(name) ? 'single' : defaultMultiPlayers.includes(name) ? 'multi' : 'none';
  // Wybór pokazujemy od razu, a do końca zapisu baza nie jest jeszcze źródłem prawdy.
  const shownCard = (name: string): CardKind => (pendingCard?.name === name ? pendingCard.card : cardOf(name));
  const playerColorMap = useMemo(
    () => createPlayerColorMap(players?.map(player => player.name) ?? []),
    [players],
  );

  const chooseCard = async (name: string, card: CardKind) => {
    if (pendingCard || shownCard(name) === card) return;
    setPendingCard({ name, card });
    try {
      const result = await setPlayerCard(name, card);
      if (result.success) playSound(SOUND_TYPES.CLICK);
      else showError(result.error || 'Nie udało się zapisać karty');
    } catch {
      // Bez tego wyjątek zostawiał wybór „w zapisie” i blokował całą listę.
      showError('Nie udało się zapisać karty');
    } finally {
      // Przy błędzie źródłem prawdy znów jest baza, czyli poprzednia karta.
      setPendingCard(null);
    }
  };

  // Komunikat pod polem zamiast cichego `return`: puste, za długie i zdublowane
  // imię mają jasną odpowiedź zamiast „nic się nie stało”.
  const trimmedName = newPlayerName.trim();
  const knownNames = [...(players ?? []).map(p => p.name), ...(deletedPlayers ?? [])];
  const nameError = !submitted ? null
    : trimmedName === '' ? 'Wpisz imię gracza'
      : trimmedName.length > MAX_PLAYER_NAME_LENGTH ? `Imię może mieć najwyżej ${MAX_PLAYER_NAME_LENGTH} znaków`
        : hasForbiddenKeyChars(trimmedName) ? FORBIDDEN_NAME_CHARS_MESSAGE
        : knownNames.some(n => n.toLowerCase() === trimmedName.toLowerCase())
          ? ((deletedPlayers ?? []).some(n => n.toLowerCase() === trimmedName.toLowerCase())
            ? 'Taki gracz jest w rezerwie — przywróć go z listy poniżej'
            : 'Taki gracz już jest w grupie')
          : null;

  const handleAddPlayer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    const duplicate = knownNames.some(n => n.toLowerCase() === trimmedName.toLowerCase());
    if (!trimmedName || trimmedName.length > MAX_PLAYER_NAME_LENGTH || hasForbiddenKeyChars(trimmedName) || duplicate) return;
    if (isAddingPlayer) return;
    setIsAddingPlayer(true);
    try {
      const result = await addPlayer(trimmedName);
      if (!result.success) { showError(result.error || 'Nie udało się dodać gracza'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess(`Dodano: ${trimmedName}`);
      setNewPlayerName('');
      setSubmitted(false);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleSoftDelete = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await softDeletePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się usunąć gracza'); return; }
      playSound(SOUND_TYPES.DELETE);
      showSuccess(`Gracz ${playerName} przeniesiony do rezerwy`);
      setPwModal(null);
    } finally {
      setProcessingPlayer(null);
    }
  };

  const handleRestore = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await restorePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się przywrócić gracza'); return; }
      playSound(SOUND_TYPES.SUCCESS);
      showSuccess(`Przywrócono: ${playerName}`);
    } finally {
      setProcessingPlayer(null);
    }
  };

  const handlePermanentDelete = async (playerName: string) => {
    if (processingPlayer) return;
    setProcessingPlayer(playerName);
    try {
      const result = await permanentDeletePlayer(playerName);
      if (!result.success) { showError(result.error || 'Nie udało się trwale usunąć'); return; }
      playSound(SOUND_TYPES.DELETE);
      setConfirmDelete(null);
    } finally {
      setProcessingPlayer(null);
    }
  };

  return (
    <>
      {pwModal && (
        <PasswordModal action={`Usuń gracza: ${pwModal}`} onConfirm={() => void handleSoftDelete(pwModal)} onCancel={() => setPwModal(null)} playSound={playSound} />
      )}

      <div className="cyber-box" style={{
        clipPath: CLIP.panel,
        padding: '20px', maxWidth: CONTENT_WIDTH.form, margin: '0 auto',
        animation: 'slide-in-up 0.3s ease-out',
      }}>
        <PanelHeader icon={Users} title="Gracze" sub={`Skład grupy · ${players?.length || 0} graczy`} />

        {/* Add player form */}
        <div style={{ marginBottom: 28 }}>
          <SectionHeader icon={UserPlus} title="Dodaj nowego gracza" />
          <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: 8 }}>
            <label htmlFor={newPlayerId} className="sr-only">Imię nowego gracza</label>
            <input id={newPlayerId} type="text" value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Imię gracza…"
              maxLength={MAX_PLAYER_NAME_LENGTH}
              autoCapitalize="words"
              autoComplete="off"
              autoCorrect="off"
              enterKeyHint="done"
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? nameErrorId : undefined}
              className={nameError ? 'cyber-input input-error' : 'cyber-input'}
              style={{ flex: 1, padding: '10px 14px', clipPath: CLIP.tag }}
              disabled={isAddingPlayer}
            />
            <button
              type="submit"
              disabled={isAddingPlayer}
              className="cyber-button-yellow"
              style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', whiteSpace: 'nowrap', flexShrink: 0, opacity: isAddingPlayer ? 0.7 : 1, cursor: isAddingPlayer ? 'not-allowed' : 'pointer' }}
            >
              {isAddingPlayer ? <InlineSpinner size="sm" /> : <UserPlus size={14} />} {isAddingPlayer ? 'Dodaję…' : 'Dodaj'}
            </button>
          </form>
          {nameError && (
            <p id={nameErrorId} role="alert" style={{ margin: '8px 0 0', ...FONT.display(TEXT.base), color: 'var(--co-rose)' }}>
              ⚠ {nameError}
            </p>
          )}
        </div>

        {/* Player list */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Cpu} title="Aktywni gracze" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {[...players]
                .sort((a, b) => {
                  if (a.name === ORGANIZER_NAME) return 1;
                  if (b.name === ORGANIZER_NAME) return -1;
                  return a.name.localeCompare(b.name, 'pl');
                })
                .map(p => (
                  <PlayerProfileCard
                    key={p.name}
                    player={p}
                    playerColor={playerColorMap.get(p.name)!}
                    onDelete={setPwModal}
                    isOrganizer={p.name === ORGANIZER_NAME}
                    disabled={processingPlayer === p.name}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Karty graczy — jedna na gracza: Multisport, Medicover albo brak */}
        {players && players.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionHeader icon={Zap} title="Karty graczy" accent="var(--co-green)" />
            <p style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-text)', marginBottom: 12 }}>
              Wybierz, jaką kartę ma każdy gracz. {CARD_EMOJI.multi} Multisport daje −{MULTISPORT_DISCOUNT} zł za każdą godzinę gry,
              {' '}{CARD_EMOJI.single} Medicover −{MULTISPORT_DISCOUNT} zł raz na sesję. Gracze z kartą są od razu zaznaczeni w „Kto miał kartę?”,
              gdy nie ma jeszcze poprzedniej sesji do skopiowania.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
              {[...players]
                .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
                .map(p => {
                  const card = shownCard(p.name);
                  return (
                    <div key={p.name} role="group" aria-label={`Karta gracza ${p.name}`}
                      style={{ padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)', clipPath: CLIP.smallCard, opacity: pendingCard ? 0.7 : 1 }}>
                      <p style={{ ...FONT.display(TEXT.base), color: 'var(--co-text)', margin: '0 0 8px', textTransform: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {CARD_CHOICES.map(({ kind, Icon, accent }) => {
                          const active = card === kind;
                          return (
                            <ToggleChip key={kind} compact active={active} accent={accent}
                              onClick={() => { void chooseCard(p.name, kind); }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '4px 6px' }}>
                              {Icon && <Icon size={12} aria-hidden="true" style={{ flexShrink: 0 }} />}
                              {kind === 'none' ? 'Brak' : CARD_NAME[kind]}
                            </ToggleChip>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Trash / deleted */}
        {deletedPlayers?.length > 0 && (
          <div>
            <SectionHeader icon={Trash2} title="Rezerwa" accent="var(--co-rose)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {deletedPlayers.map(name => (
                <div key={name}>
                  {confirmDelete === name ? (
                    <div style={{
                      padding: '14px', background: 'var(--co-tint-rose)', border: '1px solid var(--co-rose)',
                      clipPath: CLIP.smallCard,
                    }}>
                      <p style={{ ...FONT.display(TEXT.lead), color: 'var(--co-rose)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'none' }}>
                        <AlertTriangle size={12} /> Usunąć na zawsze?
                      </p>
                      <p style={{ ...FONT.mono(TEXT.small), color: 'var(--co-text)', marginBottom: 12 }}>{name}</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* `disabled`, nie samo pointerEvents — inaczej Enter na
                            zafokusowanym przycisku i tak wysyłał drugie żądanie. */}
                        <button onClick={() => void handlePermanentDelete(name)} disabled={processingPlayer === name}
                          className="cyber-button-danger"
                          style={{ flex: 1, minHeight: 44, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {processingPlayer === name ? <InlineSpinner size="sm" /> : 'Potwierdź'}
                        </button>
                        <button onClick={() => setConfirmDelete(null)} disabled={processingPlayer === name} className="cyber-button-outline" style={{ flex: 1, minHeight: 44, padding: '10px' }}>
                          Anuluj
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: 'var(--co-dark)', border: '1px solid var(--co-border)',
                      clipPath: CLIP.smallCard,
                    }}>
                      {/* `--co-close-btn` to token przycisku zamknięcia, nie koloru
                          treści — w ciemnym motywie miał ~2:1 na nazwie gracza. */}
                      <span style={{ ...FONT.display(TEXT.base), color: 'var(--co-text)', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <Cpu size={14} style={{ color: 'var(--co-dim)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      </span>
                      {/* Dwa cele ~25×29px stały 6px od siebie, a jeden z nich
                          usuwa gracza bezpowrotnie. Teraz 44px i 10px odstępu. */}
                      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        <button onClick={() => void handleRestore(name)} disabled={processingPlayer === name}
                          className="icon-btn"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44,
                            background: 'transparent', border: '1px solid var(--co-border)',
                            cursor: processingPlayer === name ? 'not-allowed' : 'pointer',
                            color: 'var(--co-dim)',
                            clipPath: CLIP.badge,
                            opacity: processingPlayer === name ? 0.65 : 1,
                          }}
                          title="Przywróć" aria-label={`Przywróć gracza ${name}`}>
                          <RotateCcw size={16} aria-hidden="true" />
                        </button>
                        <button onClick={() => setConfirmDelete(name)}
                          className="icon-btn danger"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 44, height: 44,
                            background: 'transparent', border: '1px solid var(--co-border)', cursor: 'pointer',
                            color: 'var(--co-dim)',
                            clipPath: CLIP.badge,
                          }}
                          title="Usuń na zawsze" aria-label={`Usuń gracza ${name} na zawsze`}>
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
