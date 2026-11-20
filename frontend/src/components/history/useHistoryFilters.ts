import { useState, useMemo, useEffect, useCallback } from 'react';
import { groupHistoryByMonth, getAvailableSeasons, filterHistoryByYear } from '@/utils/sessions';
import { SPORT_LABEL } from '@/constants';
import type { HistoryEntry } from '@/types/ui';

/** Ile sesji pokazujemy na raz. 50 rekordów dawało 17 863 px strony na telefonie. */
export const SESSIONS_PAGE_SIZE = 12;

/**
 * Filtry listy historii: sezon, gracz, sport, wyszukiwarka, kolejność i
 * paginacja. Zmiana któregokolwiek filtra wraca do pierwszej strony.
 */
export function useHistoryFilters(history: HistoryEntry[]) {
  const [filterPlayer, setFilterPlayer] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chosenSeason, setChosenSeason] = useState<number | null | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PAGE_SIZE);

  const seasons = useMemo(() => getAvailableSeasons(history), [history]);
  const selectedSeason = chosenSeason === undefined ? null : chosenSeason;
  const seasonHistory = useMemo(
    () => filterHistoryByYear(history, selectedSeason),
    [history, selectedSeason],
  );

  const filteredHistory = useMemo(() => {
    let h = seasonHistory;
    if (filterPlayer) h = h.filter(s => s.presentPlayers.includes(filterPlayer));
    if (filterSport) h = h.filter(s => s.sport === filterSport);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      h = h.filter(s =>
        s.datePlayed.toLowerCase().includes(q) ||
        (SPORT_LABEL[s.sport] ?? '').toLowerCase().includes(q) ||
        s.presentPlayers.some(p => p.toLowerCase().includes(q)) ||
        s.multisportPlayers.some(p => p.toLowerCase().includes(q)),
      );
    }
    return sortOrder === 'asc' ? [...h].reverse() : h;
  }, [seasonHistory, filterPlayer, filterSport, searchQuery, sortOrder]);

  useEffect(() => { setVisibleCount(SESSIONS_PAGE_SIZE); }, [filterPlayer, filterSport, searchQuery, sortOrder, selectedSeason]);

  const visibleHistory = filteredHistory.slice(0, visibleCount);
  const hasMoreSessions = visibleCount < filteredHistory.length;
  const grouped = groupHistoryByMonth(visibleHistory);

  const showMore = useCallback(() => {
    setVisibleCount(count => Math.min(count + SESSIONS_PAGE_SIZE, filteredHistory.length));
  }, [filteredHistory.length]);

  const toggleSort = useCallback(() => {
    setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'));
  }, []);

  return {
    filterPlayer, setFilterPlayer,
    filterSport, setFilterSport,
    searchQuery, setSearchQuery,
    sortOrder, toggleSort,
    seasons, selectedSeason, setChosenSeason,
    seasonHistory, filteredHistory, visibleHistory, hasMoreSessions, grouped,
    showMore,
  };
}
