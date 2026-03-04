// Loading skeleton and spinner components

export function PlayerCardSkeleton() {
  return (
    <div className="cyber-box rounded-2xl overflow-hidden animate-pulse">
      <div className="bg-cyan-950/50 p-4 border-b-2 border-cyan-600">
        <div className="h-6 bg-cyan-800/30 rounded w-24" />
      </div>
      <div className="p-6">
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-cyan-800/20 rounded w-32 mx-auto" />
          <div className="h-4 bg-cyan-800/20 rounded w-24 mx-auto" />
        </div>
        <div className="h-20 bg-cyan-800/20 rounded mb-4" />
        <div className="h-10 bg-cyan-800/20 rounded" />
      </div>
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="cyber-box rounded-xl p-4 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 bg-cyan-800/20 rounded w-24" />
        <div className="h-5 bg-cyan-800/20 rounded w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-cyan-800/20 rounded w-full" />
        <div className="h-4 bg-cyan-800/20 rounded w-3/4" />
      </div>
    </div>
  );
}

export function HistoryRowSkeleton() {
  return (
    <div className="cyber-box rounded-xl p-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-cyan-900/20 rounded" />
        ))}
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="cyber-box rounded-2xl p-6 animate-pulse">
      <div className="h-8 bg-cyan-800/20 rounded w-48 mb-8" />
      <div className="flex items-end justify-center gap-4 mb-8">
        {[
          'h-32 bg-slate-900/50',
          'h-32 bg-yellow-950/50',
          'h-32 bg-amber-950/50',
        ].map((cls, i) => (
          <div key={i} className="flex-1 max-w-[180px]">
            <div className={`w-full ${cls} rounded-xl mb-2`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="cyber-box rounded-2xl p-6 animate-pulse">
      <div className="h-8 bg-cyan-800/20 rounded w-48 mb-6" />
      <div className="space-y-3">
        <div className="flex gap-4 bg-cyan-950/50 p-3 rounded">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-cyan-800/30 rounded flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-cyan-800/20 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ButtonSkeleton({ fullWidth = false }) {
  return (
    <div className={`h-12 bg-cyan-800/20 rounded-xl animate-pulse ${fullWidth ? 'w-full' : 'w-32'}`} />
  );
}

export function SpinnerOverlay({ message = 'Ładowanie...' }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="cyber-box rounded-2xl p-8 text-center">
        <div className="inline-block w-16 h-16 border-4 border-cyan-800 border-t-cyan-400 rounded-full animate-spin mb-4" />
        <p className="text-cyan-300 font-bold tracking-wider">{message}</p>
      </div>
    </div>
  );
}

export function InlineSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };
  return (
    <div className={`inline-block ${sizeClasses[size]} border-cyan-800 border-t-cyan-400 rounded-full animate-spin`} />
  );
}
