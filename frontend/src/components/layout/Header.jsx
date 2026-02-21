import { Volume2, VolumeX } from 'lucide-react';

export default function Header({ isMuted, setIsMuted, isConnected }) {
  return (
    <div className="ascii-header-container rounded-t-2xl mb-1 relative">

      {/* Status Firebase — zielona/czerwona kropka */}
      <div className="absolute top-4 left-4 flex items-center gap-2 z-50">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`}></span>
        <span className="text-xs text-cyan-700 font-mono">{isConnected ? 'FIREBASE OK' : 'ŁĄCZENIE...'}</span>
      </div>

      {/* Przycisk wyciszenia */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 text-cyan-500 hover:text-cyan-300 transition-colors p-2 border-2 border-cyan-700 rounded-lg bg-black/50 z-50 shadow-[0_0_10px_#00f3ff20]"
        title={isMuted ? "Włącz dźwięki" : "Wyłącz dźwięki"}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Animacja ASCII pong */}
      <div className="ascii-pong-field">
        <span className="paddle text-neon-pink">[</span>
        <div className="ball-court">
          <span className="ascii-ball text-neon-blue">●</span>
        </div>
        <span className="paddle text-neon-pink">]</span>
      </div>

      <h1 className="text-2xl md:text-3xl text-cyan-300 text-neon-blue mt-6 flex items-center justify-center">
        <span className="header-paddle -rotate-[20deg]"></span>
        SYSTEM ROZLICZEŃ PING-PONG
      </h1>

      <div className="ping-pong-loader block w-full min-h-[4px] mt-4 mb-2"></div>

      <p className="text-cyan-700 text-sm mt-3 tracking-widest">v2.0 // Ping Pong Club × Firebase</p>
    </div>
  );
}
