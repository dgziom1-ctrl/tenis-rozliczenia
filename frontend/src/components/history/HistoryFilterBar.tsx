import type { Dispatch, SetStateAction } from 'react';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import ToggleChip from '../common/ToggleChip';
import { SPORT_LABEL } from '@/constants';
import { CLIP, FONT, TEXT } from '@/constants/styles';

interface HistoryFilterBarProps {
  playerNames: string[];
  isMobile: boolean;
  filterPlayer: string;
  onFilterPlayer: Dispatch<SetStateAction<string>>;
  filterSport: string;
  onFilterSport: Dispatch<SetStateAction<string>>;
  searchQuery: string;
  onSearch: (query: string) => void;
  sortOrder: 'desc' | 'asc';
  onToggleSort: () => void;
  /** Ile sesji przechodzi przez bieżące filtry. */
  matchCount: number;
  /** Na telefonie wybór gracza otwiera arkusz zamiast rzędu chipów. */
  onOpenPlayerSheet: () => void;
  onExportCsv: () => void;
}

/** Pasek kontrolek historii: filtr gracza i sportu, szukanie, sortowanie, CSV. */
export default function HistoryFilterBar({
  playerNames, isMobile, filterPlayer, onFilterPlayer, filterSport, onFilterSport,
  searchQuery, onSearch, sortOrder, onToggleSort, matchCount, onOpenPlayerSheet, onExportCsv,
}: HistoryFilterBarProps) {
  return (
    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

      {/* Etykieta filtra */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--co-tint)', border: '1px solid var(--co-tint-hi)', clipPath: CLIP.badge, flexShrink: 0 }}>
        <Search size={11} style={{ color: 'var(--co-dim)' }} />
        <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)', letterSpacing: 'normal' }}>Filtr</span>
      </div>

      {isMobile ? (
        <>
          <button
            type="button"
            onClick={onOpenPlayerSheet}
            aria-haspopup="dialog"
            aria-label={filterPlayer ? `Filtr gracza: ${filterPlayer}` : 'Filtr gracza: wszyscy'}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.8125rem',
              letterSpacing: 'normal',
              minHeight: 44,
              padding: '6px 10px',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'var(--co-border)',
              color: filterPlayer ? 'var(--co-cyan)' : 'var(--co-dim)',
              background: 'transparent',
              clipPath: CLIP.badge,
              transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
              flexShrink: 0,
            }}
          >
            {filterPlayer || 'Wszyscy'}
          </button>

          {filterPlayer && (
            <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
              {matchCount} sesji
            </span>
          )}
        </>
      ) : (
        <>
          <ToggleChip compact active={!filterPlayer} onClick={() => onFilterPlayer('')}>
            Wszyscy
          </ToggleChip>
          {playerNames.map(name => (
            <ToggleChip compact key={name} active={filterPlayer === name}
              onClick={() => onFilterPlayer(prev => prev === name ? '' : name)}>
              {name}
            </ToggleChip>
          ))}

          {filterPlayer && (
            <span style={{ ...FONT.mono(TEXT.tiny), color: 'var(--co-dim)' }}>
              {matchCount} sesji
            </span>
          )}
        </>
      )}

      {/* Rozpychacz i separator były zwykłymi elementami zawijanego
          kontenera: gdy chipy graczy przechodziły do drugiej linii,
          rozpychacz spadał do własnego rzędu, a kreska zostawała sama
          na początku linii. Akcje mają teraz osobną, nierozdzielną grupę. */}
      {/* Filtr po sporcie */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <ToggleChip compact active={!filterSport} onClick={() => onFilterSport('')} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Wszystkie sporty</ToggleChip>
        {Object.entries(SPORT_LABEL).map(([key, label]) => (
          <ToggleChip compact key={key} active={filterSport === key} onClick={() => onFilterSport(prev => prev === key ? '' : key)} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>{label}</ToggleChip>
        ))}
      </div>

      {/* Wyszukiwarka tekstowa */}
      {/* Bez lokalnego `fontSize`: 13 px zmuszało iOS do automatycznego
          przybliżenia strony przy każdym dotknięciu pola. 16 px z
          `.cyber-input` jest progiem, poniżej którego Safari zoomuje. */}
      <input type="search" value={searchQuery} onChange={e => onSearch(e.target.value)} placeholder="Szukaj (data, gracz, sport)..." aria-label="Szukaj w historii" className="cyber-input" style={{ flex: '1 1 160px', minWidth: 140, padding: '6px 10px', fontFamily: 'var(--font-mono)', clipPath: CLIP.badge }} />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div aria-hidden="true" style={{ width: 1, height: 18, background: 'var(--co-border)' }} />

      {/* Sort */}
      <button
        type="button"
        onClick={onToggleSort}
        title={sortOrder === 'desc' ? 'Najnowsze pierwsze' : 'Najstarsze pierwsze'}
        aria-label={sortOrder === 'desc'
          ? 'Sortowanie: najnowsze pierwsze — zmień na najstarsze'
          : 'Sortowanie: najstarsze pierwsze — zmień na najnowsze'}
        className="icon-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          minHeight: 44, padding: '8px 10px', cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--co-border)',
          color: 'var(--co-dim)',
          clipPath: CLIP.badge,
          ...FONT.mono(TEXT.tiny), letterSpacing: 'normal',
          flexShrink: 0,
        }}
      >
        <ArrowUpDown size={12} aria-hidden="true" />
        {sortOrder === 'desc' ? 'Nowe' : 'Stare'}
      </button>

      {/* CSV */}
      <button
        type="button"
        onClick={onExportCsv}
        title="Pobierz CSV"
        aria-label="Eksportuj CSV"
        className="icon-btn"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          minHeight: 44, padding: '8px 10px', cursor: 'pointer',
          background: 'transparent', border: '1px solid var(--co-border)',
          color: 'var(--co-dim)',
          clipPath: CLIP.badge,
          ...FONT.mono(TEXT.tiny), letterSpacing: 'normal',
          flexShrink: 0,
        }}
      >
        <Download size={12} aria-hidden="true" />
        CSV
      </button>
      </div>
    </div>
  );
}
