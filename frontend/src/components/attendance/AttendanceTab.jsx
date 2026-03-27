import { useMemo, useState, useCallback, useEffect } from 'react';
import { SOUND_TYPES } from '../../constants';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth, getAvailableSeasons, filterHistoryByYear, calculateSeasonPlayerStats } from '../../utils/calculations';
import { computeWrappedStats } from '../../utils/wrapped';
import Leaderboard from './Leaderboard';
import RankingHistoryChart from './RankingHistoryChart';
import MonthlyReport from './MonthlyReport';
import PlayerSessionModal from './PlayerSessionModal';
import SeasonSelector from './SeasonSelector';
import WrappedModal from './WrappedModal';

// ─── Main ────────────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary, playSound, initialPlayer, onInitialPlayerConsumed }) {
  const totalWeeks = summary?.totalWeeks || 0;
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null); // null = all time
  const [wrappedYear, setWrappedYear] = useState(null);

  // Auto-otwórz modal gracza gdy przyszło powiadomienie push o serii
  useEffect(() => {
    if (!initialPlayer) return;
    setSelectedPlayer(initialPlayer);
    if (onInitialPlayerConsumed) onInitialPlayerConsumed();
  }, [initialPlayer, onInitialPlayerConsumed]);

  const seasons = useMemo(() => getAvailableSeasons(history), [history]);
  const currentYear = new Date().getFullYear();

  // Filter history by selected season
  const seasonHistory = useMemo(
    () => selectedSeason ? filterHistoryByYear(history, selectedSeason) : history,
    [history, selectedSeason]
  );
  const seasonTotalWeeks = selectedSeason ? seasonHistory.length : totalWeeks;

  // Use season-aware stats when filtering, global stats for all-time
  const stats = useMemo(() => {
    if (selectedSeason) {
      return calculateSeasonPlayerStats(players, seasonHistory);
    }
    return calculatePlayerStats(players, history, totalWeeks);
  }, [players, history, seasonHistory, totalWeeks, selectedSeason]);

  const ranked = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      if (b.attendancePercentage !== a.attendancePercentage) return b.attendancePercentage - a.attendancePercentage;
      if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
      return a.name.localeCompare(b.name, 'pl');
    });
    return assignRankingPlaces(sorted);
  }, [stats]);

  const handleSelect = useCallback((name) => {
    setSelectedPlayer(name);
    if (!playSound) return;
    const player = ranked.find(p => p.name === name);
    if (player?.place === 1) {
      playSound(SOUND_TYPES.RANK1);
    } else {
      playSound(SOUND_TYPES.CLICK);
    }
  }, [ranked, playSound]);

  const podiumPlayers = useMemo(() => {
    const byPlace = {};
    ranked.forEach(p => { if (!byPlace[p.place]) byPlace[p.place] = []; byPlace[p.place].push(p); });
    return [1, 2, 3].filter(place => byPlace[place]?.length > 0).map(place => ({ place, players: byPlace[place] }));
  }, [ranked]);

  const monthlyStats = useMemo(() => groupSessionsByMonth(seasonHistory), [seasonHistory]);

  const selectedStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return ranked.find(p => p.name === selectedPlayer);
  }, [selectedPlayer, ranked]);

  // Wrapped stats for the selected past year
  const wrappedStats = useMemo(() => {
    if (!wrappedYear) return null;
    return computeWrappedStats(history, players, wrappedYear);
  }, [wrappedYear, history, players]);

  // Past seasons that can show Wrapped (not the current year)
  const _wrappableSeasons = useMemo(() => seasons.filter(y => y < currentYear), [seasons, currentYear]);

  return (
    <>
    {selectedStats && (
      <PlayerSessionModal
        player={selectedStats}
        history={seasonHistory}
        totalWeeks={seasonTotalWeeks}
        onClose={() => setSelectedPlayer(null)}
      />
    )}
    {wrappedStats && (
      <WrappedModal stats={wrappedStats} onClose={() => setWrappedYear(null)} />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-in-up 0.3s ease-out' }}>
      <SeasonSelector seasons={seasons} selected={selectedSeason} onChange={setSelectedSeason} />

      {/* Wrapped button — show when a past season is selected */}
      {selectedSeason && selectedSeason < currentYear && (
        <button
          onClick={() => setWrappedYear(selectedSeason)}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, rgba(204,0,255,0.1), rgba(0,229,255,0.1))',
            border: '1px solid rgba(204,0,255,0.3)',
            color: 'var(--co-text-hi)',
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            letterSpacing: '0.12em',
            clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s',
            textShadow: '0 0 10px rgba(204,0,255,0.4)',
          }}
        >
          🎬 PODSUMOWANIE ROKU {selectedSeason}
        </button>
      )}

      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={seasonTotalWeeks} stats={stats} onSelect={handleSelect} />
      <RankingHistoryChart players={players} history={seasonHistory} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
    </div>
  </>
  );
}
