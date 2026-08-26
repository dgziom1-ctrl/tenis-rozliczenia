import { useMemo, useState, useCallback, useEffect } from 'react';
import { SOUND_TYPES } from '@/constants';
import { calculatePlayerStats, assignRankingPlaces, calculateSeasonPlayerStats } from '@/utils/rankings';
import { groupSessionsByMonth, getAvailableSeasons, filterHistoryByYear } from '@/utils/sessions';
import { computeWrappedStats } from '@/utils/wrapped';
import Leaderboard from './Leaderboard';
import RankingHistoryChart from './RankingHistoryChart';
import MonthlyReport from './MonthlyReport';
import PlayerSessionModal from './PlayerSessionModal';
import SeasonSelector from './SeasonSelector';
import WrappedModal from './WrappedModal';
import type { HistoryEntry, PlayerStats, RankedPlayer, SoundType, Summary } from '@/types/ui';

interface AttendanceTabProps {
  players: PlayerStats[];
  history: HistoryEntry[];
  summary: Summary;
  playSound?: (type: SoundType) => void;
  initialPlayer: string | null;
  onInitialPlayerConsumed?: () => void;
}

// ─── Main ────────────────────────────────────────────────────────
export default function AttendanceTab({ players, history, summary, playSound, initialPlayer, onInitialPlayerConsumed }: AttendanceTabProps) {
  const totalWeeks = summary?.totalWeeks || 0;
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null); // null = all time
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);

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

  const handleSelect = useCallback((name: string) => {
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
    const byPlace: Record<number, RankedPlayer[]> = {};
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

  const handleCloseModal = useCallback(() => setSelectedPlayer(null), []);
  const handleCloseWrapped = useCallback(() => setWrappedYear(null), []);

  return (
    <>
    {selectedStats && (
      <PlayerSessionModal
        player={selectedStats}
        history={seasonHistory}
        onClose={handleCloseModal}
      />
    )}
    {wrappedStats && (
      <WrappedModal stats={wrappedStats} onClose={handleCloseWrapped} />
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

      <Leaderboard ranked={ranked} podiumPlayers={podiumPlayers} onSelect={handleSelect} />
      <RankingHistoryChart players={players} history={seasonHistory} />
      <MonthlyReport monthlyStats={monthlyStats} players={players} />
    </div>
  </>
  );
}
