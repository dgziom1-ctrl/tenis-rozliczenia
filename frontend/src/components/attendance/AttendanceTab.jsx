import { useMemo, useState, useCallback, useEffect } from 'react';
import { SOUND_TYPES } from '../../constants';
import { calculatePlayerStats, assignRankingPlaces, groupSessionsByMonth } from '../../utils/calculations';
import Leaderboard from './Leaderboard';
import RankingHistoryChart from './RankingHistoryChart';
import MonthlyReport from './MonthlyReport';
import PlayerSessionModal from './PlayerSessionModal';

// ─── Main ────────────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary, playSound, initialPlayer, onInitialPlayerConsumed }) {
  const totalWeeks = summary?.totalWeeks || 0;
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Auto-otwórz modal gracza gdy przyszło powiadomienie push o serii
  useEffect(() => {
    if (!initialPlayer) return;
    setSelectedPlayer(initialPlayer);
    if (onInitialPlayerConsumed) onInitialPlayerConsumed();
  }, [initialPlayer, onInitialPlayerConsumed]);
  const stats      = useMemo(() => calculatePlayerStats(players, history, totalWeeks), [players, history, totalWeeks]);

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

  const monthlyStats = useMemo(() => groupSessionsByMonth(history), [history]);

  const selectedStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return ranked.find(p => p.name === selectedPlayer);
  }, [selectedPlayer, ranked]);

  return (
    <>
    {selectedStats && (
      <PlayerSessionModal
        player={selectedStats}
        history={history}
        totalWeeks={totalWeeks}
        onClose={() => setSelectedPlayer(null)}
      />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'slide-in-up 0.3s ease-out' }}>
      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} totalWeeks={totalWeeks} stats={stats} onSelect={handleSelect} />
      <RankingHistoryChart players={players} history={history} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
    </div>
  </>
  );
}
