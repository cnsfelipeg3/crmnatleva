import { useEffect, useState } from "react";
import logoImg from "@/assets/logo-natleva-clean.png";

export default function NatLevaLoader() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Phase progression: 0=taxi, 1=accelerate, 2=liftoff, 3=climb, 4=fade
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4200),
      setTimeout(() => setPhase(0), 5000),
    ];
    const loop = setInterval(() => {
      setPhase(0);
      timers.forEach(clearTimeout);
      timers.length = 0;
      timers.push(
        setTimeout(() => setPhase(1), 800),
        setTimeout(() => setPhase(2), 2000),
        setTimeout(() => setPhase(3), 3200),
        setTimeout(() => setPhase(4), 4200),
      );
    }, 5000);
    return () => { timers.forEach(clearTimeout); clearInterval(loop); };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[hsl(158,50%,6%)] overflow-hidden">
      {/* Horizon gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,50%,6%)] via-[hsl(158,40%,10%)] to-[hsl(210,30%,12%)]" />
      
      {/* Subtle stars */}
      <div className="absolute inset-0 opacity-30">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 40}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main animation container */}
      <div className="relative w-full max-w-lg h-64 sm:h-72 flex items-end justify-center">
        
        {/* Runway */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-1000 ease-in-out"
          style={{
            opacity: phase >= 3 ? 0 : 1,
            transform: `translateX(-50%) perspective(600px) rotateX(${phase >= 2 ? 8 : 4}deg)`,
          }}
        >
          {/* Runway surface */}
          <div className="relative w-80 sm:w-96 h-3 bg-gradient-to-r from-transparent via-[hsl(160,8%,20%)] to-transparent rounded-full">
            {/* Center dashes */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 px-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[2px] rounded-full flex-1 transition-all duration-200"
                  style={{
                    backgroundColor: `hsla(160, 60%, 50%, ${phase >= 1 ? 0.8 : 0.25})`,
                    boxShadow: phase >= 1 ? '0 0 6px hsla(160, 60%, 50%, 0.4)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Runway edge lights */}
          <div className="absolute -top-1 left-4 right-4 flex justify-between">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: phase >= 1
                    ? `hsla(160, 60%, 50%, ${0.3 + Math.random() * 0.5})`
                    : 'hsla(160, 20%, 30%, 0.3)',
                  boxShadow: phase >= 1
                    ? `0 0 8px hsla(160, 60%, 50%, 0.6)`
                    : 'none',
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Speed lines */}
        {phase >= 1 && phase < 3 && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 sm:w-96">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-[1px] bg-gradient-to-r from-transparent via-[hsl(160,60%,50%)] to-transparent animate-[speedLine_0.4s_linear_infinite]"
                style={{
                  width: 40 + Math.random() * 60,
                  top: -4 + Math.random() * 12,
                  left: `${20 + Math.random() * 60}%`,
                  opacity: 0.2 + Math.random() * 0.3,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Airplane */}
        <div
          className="absolute transition-all ease-in-out"
          style={{
            bottom: phase === 0 ? 24 : phase === 1 ? 26 : phase === 2 ? 60 : phase === 3 ? 180 : 220,
            left: phase === 0 ? '30%' : phase === 1 ? '45%' : phase === 2 ? '55%' : '60%',
            transform: `rotate(${phase === 0 ? 0 : phase === 1 ? -2 : phase === 2 ? -15 : phase === 3 ? -25 : -30}deg) scale(${phase >= 4 ? 0.6 : 1})`,
            opacity: phase >= 4 ? 0 : 1,
            transitionDuration: phase === 0 ? '300ms' : phase === 1 ? '1200ms' : '1000ms',
            filter: phase >= 2 ? 'drop-shadow(0 0 12px hsla(160, 60%, 50%, 0.4))' : 'none',
          }}
        >
          {/* SVG Airplane */}
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="drop-shadow-lg">
            <g transform="rotate(-90, 24, 24)">
              {/* Fuselage */}
              <path
                d="M24 4 C22 4, 20 8, 20 14 L20 28 L8 36 L8 34 L18 28 L18 14 C18 7, 20 2, 24 2 C28 2, 30 7, 30 14 L30 28 L40 34 L40 36 L28 28 L28 14 C28 8, 26 4, 24 4Z"
                fill="hsl(160, 60%, 50%)"
                opacity="0.95"
              />
              {/* Tail */}
              <path
                d="M22 38 L22 44 L18 46 L18 44 L22 42 L22 38Z M26 38 L26 44 L30 46 L30 44 L26 42 L26 38Z"
                fill="hsl(160, 60%, 42%)"
                opacity="0.8"
              />
              {/* Cockpit window */}
              <ellipse cx="24" cy="10" rx="2" ry="3" fill="hsl(210, 40%, 70%)" opacity="0.7" />
            </g>
          </svg>

          {/* Engine glow */}
          {phase >= 1 && (
            <div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-6 rounded-full bg-gradient-to-b from-[hsl(160,60%,50%)] to-transparent opacity-60 blur-sm animate-pulse"
            />
          )}
        </div>

        {/* Contrail */}
        {phase >= 2 && phase < 4 && (
          <div
            className="absolute transition-all duration-1000"
            style={{
              bottom: phase === 2 ? 40 : 100,
              left: phase === 2 ? '40%' : '35%',
              opacity: phase === 3 ? 0.3 : 0.5,
            }}
          >
            <div className="w-32 h-[2px] bg-gradient-to-l from-white/40 to-transparent rounded-full blur-[1px]"
              style={{ transform: `rotate(${phase === 2 ? -15 : -25}deg)` }}
            />
          </div>
        )}
      </div>

      {/* Logo & text */}
      <div
        className="relative z-10 flex flex-col items-center gap-4 mt-2 transition-all duration-700"
        style={{ opacity: phase >= 4 ? 0.5 : 1 }}
      >
        <img
          src={logoImg}
          alt="NatLeva"
          className="h-8 sm:h-10 object-contain opacity-80"
        />
        <div className="flex items-center gap-2">
          <p className="text-sm sm:text-base font-light tracking-[0.2em] text-[hsl(158,12%,60%)]">
            Preparando sua jornada
          </p>
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-[hsl(160,60%,50%)] animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-[2px] bg-[hsl(158,30%,15%)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[hsl(160,60%,42%)] to-[hsl(160,60%,55%)] rounded-full transition-all ease-linear"
            style={{
              width: phase === 0 ? '10%' : phase === 1 ? '35%' : phase === 2 ? '60%' : phase === 3 ? '85%' : '100%',
              transitionDuration: phase === 0 ? '800ms' : '1200ms',
              boxShadow: '0 0 8px hsla(160, 60%, 50%, 0.5)',
            }}
          />
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes speedLine {
          from { transform: translateX(100px); opacity: 0; }
          50% { opacity: 0.4; }
          to { transform: translateX(-200px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
