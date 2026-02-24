import { Volume2, VolumeX, Smartphone, Copy, Check, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Header({ isMuted, setIsMuted }) {
  const [copied, setCopied] = useState(false);

  const blikNumber = import.meta.env.VITE_BLIK_NUMBER || "SKONFIGURUJ .ENV";

  const handleCopy = () => {
    navigator.clipboard.writeText(blikNumber.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="relative overflow-hidden rounded-t-2xl bg-gradient-to-b from-black via-gray-950 to-gray-900">
        
        {/* GÓRNY PASEK - BLIK + MUTE */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/50 bg-black/40 backdrop-blur-sm">
          
          {/* BLIK Button */}
          <button 
            onClick={handleCopy}
            className="group flex items-center gap-2 px-3 py-2 border border-cyan-600/60 rounded-lg bg-black/60 hover:bg-cyan-950/60 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300"
            title="Kliknij aby skopiować numer"
          >
            <Smartphone size={18} className="text-cyan-500 group-hover:text-cyan-300 transition-colors" />
            
            <span className="text-xs font-black tracking-[0.2em] text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)] px-1.5 py-0.5 bg-yellow-400/10 rounded">
              BLIK
            </span>

            <span className="text-sm font-mono font-bold tracking-wider text-cyan-300">
              {blikNumber}
            </span>

            <div className="w-px h-4 bg-cyan-700/50 mx-1" />

            {copied ? (
              <Check size={16} className="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
            ) : (
              <Copy size={16} className="text-cyan-500/50 group-hover:text-cyan-300 transition-all" />
            )}
          </button>

          {/* MUTE Button */}
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-300
              ${isMuted 
                ? 'border-red-500/60 bg-red-950/30 text-red-400 hover:bg-red-900/40' 
                : 'border-cyan-600/60 bg-black/60 text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300'
              }
              hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]
            `}
            title={isMuted ? "Włącz dźwięk" : "Wycisz"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        {/* SEKCJA GŁÓWNA - ANIMACJA PONG + TYTUŁ */}
        <div className="px-4 py-8 flex flex-col items-center">
          
          {/* Animacja ASCII Pong */}
          <div className="ascii-pong-field mb-6">
            <span className="paddle text-pink-500 text-2xl font-bold drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">「</span>
            <div className="ball-court mx-4">
              <span className="ascii-ball text-cyan-400 text-xl drop-shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse">●</span>
            </div>
            <span className="paddle text-pink-500 text-2xl font-bold drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">」</span>
          </div>

          {/* Główny Tytuł */}
          <h1 className="text-center mb-4 w-full">
            <span className="block text-2xl sm:text-3xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-400 to-white uppercase italic">
              CENTRUM DOWODZENIA
            </span>
            
            {/* PING-PONG z rakietkami */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-2 flex-nowrap">
              
              {/* Lewa rakietka */}
              <div className="relative transform -rotate-45 hover:rotate-0 transition-transform duration-300 flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 shadow-[0_0_15px_rgba(236,72,153,0.8)] flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-pink-300"></div>
                </div>
                <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-3 sm:h-4 md:h-5 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-full"></div>
              </div>

              {/* PING-PONG text */}
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wider sm:tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 whitespace-nowrap">
                PING-PONG
              </span>

              {/* Prawa rakietka */}
              <div className="relative transform rotate-45 hover:rotate-0 transition-transform duration-300 flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-[0_0_15px_rgba(34,211,238,0.8)] flex items-center justify-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-cyan-300"></div>
                </div>
                <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-1.5 sm:w-2 h-3 sm:h-4 md:h-5 bg-gradient-to-b from-amber-600 to-amber-800 rounded-b-full"></div>
              </div>
              
            </div>
          </h1>

          {/* Loader Bar */}
          <div className="w-full max-w-md h-1 bg-gray-800 rounded-full overflow-hidden mt-4 mb-4">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full animate-pulse" 
                 style={{ width: '100%' }} />
          </div>

          {/* Branding Footer */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs tracking-widest flex-wrap justify-center">
            <span className="text-cyan-600 font-mono">V2.0</span>
            <span className="text-gray-600">//</span>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-yellow-500" />
              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                CYBER PONK
              </span>
            </div>
            <span className="text-pink-600 font-bold">×</span>
            <span className="font-bold text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]">
              FIREHOST
            </span>
          </div>

        </div>

        {/* EFEKTY DEKORACYJNE */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-24 h-24 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
             style={{
               backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.1) 2px, rgba(0,255,255,0.1) 4px)'
             }} />
      </header>

      {/* SEPARATOR A - MINIMALISTYCZNY */}
      <div className="h-4 bg-gradient-to-b from-gray-900 to-gray-950 border-b border-cyan-900/30">
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      </div>
    </>
  );
}
