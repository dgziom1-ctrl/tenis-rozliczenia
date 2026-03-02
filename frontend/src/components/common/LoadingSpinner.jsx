export function LoadingSpinner({ size = 'md', message = '' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-2 border-cyan-400 border-t-transparent rounded-full animate-spin`} />
      {message && <p className="text-cyan-500 text-sm animate-pulse">{message}</p>}
    </div>
  );
}

export function FullPageLoader({ message = 'Ładowanie...' }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="cyber-box rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-cyan-950/50 p-4 border-b-2 border-cyan-600">
        <div className="h-6 bg-cyan-800/30 rounded w-32" />
      </div>
      <div className="p-6">
        <div className="space-y-3 mb-4">
          <div className="h-4 bg-cyan-900/20 rounded w-full" />
          <div className="h-4 bg-cyan-900/20 rounded w-2/3" />
        </div>
        <div className="h-20 bg-cyan-950/30 rounded-xl mb-4" />
        <div className="h-12 bg-cyan-900/20 rounded-xl" />
      </div>
    </div>
  );
}

export function HistoryRowSkeleton() {
  return (
    <div className="cyber-box rounded-xl p-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="h-12 bg-cyan-900/20 rounded" />
        <div className="h-12 bg-cyan-900/20 rounded" />
        <div className="h-12 bg-cyan-900/20 rounded" />
        <div className="h-12 bg-cyan-900/20 rounded" />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="cyber-box rounded-2xl p-6 animate-pulse">
      <div className="h-8 bg-cyan-900/20 rounded w-48 mb-8" />
      <div className="flex items-end justify-center gap-4 mb-8">
        <div className="flex-1 max-w-[180px]">
          <div className="h-32 bg-slate-900/50 rounded-xl mb-2" />
          <div className="h-20 bg-slate-900/50 rounded-t-xl" />
        </div>
        <div className="flex-1 max-w-[180px]">
          <div className="h-32 bg-yellow-950/50 rounded-xl mb-2" />
          <div className="h-32 bg-yellow-950/50 rounded-t-xl" />
        </div>
        <div className="flex-1 max-w-[180px]">
          <div className="h-32 bg-amber-950/50 rounded-xl mb-2" />
          <div className="h-14 bg-amber-950/50 rounded-t-xl" />
        </div>
      </div>
    </div>
  );
}
