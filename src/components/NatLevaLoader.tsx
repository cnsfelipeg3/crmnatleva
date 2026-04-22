import logoImg from "@/assets/logo-natleva-clean.webp";

export default function NatLevaLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(to top, hsl(158,50%,6%), hsl(158,40%,10%) 60%, hsl(210,30%,12%))" }}>

      {/* Stars */}
      <div className="absolute inset-0 opacity-30" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="absolute rounded-full animate-pulse"
            style={{
              width: 1 + (i % 3),
              height: 1 + (i % 3),
              background: "hsla(0,0%,100%,0.6)",
              top: `${(i * 7.3) % 40}%`,
              left: `${(i * 13.7) % 100}%`,
              animationDelay: `${(i * 0.4) % 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main scene */}
      <div className="relative w-full max-w-lg h-64 sm:h-72 flex items-end justify-center">

        {/* Runway — fades out during climb */}
        <div className="absolute bottom-8 left-1/2 runway-container">
          <div className="relative w-80 sm:w-96 h-3 rounded-full"
            style={{ background: "linear-gradient(to right, transparent, hsl(160,8%,20%), transparent)" }}>
            <div className="absolute inset-0 flex items-center justify-center gap-3 px-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-[2px] rounded-full flex-1 runway-dash"
                  style={{ animationDelay: `${i * 0.08}s` }} />
              ))}
            </div>
          </div>
          {/* Edge lights */}
          <div className="absolute -top-1 left-4 right-4 flex justify-between">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full runway-light"
                style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        </div>

        {/* Speed lines */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-80 sm:w-96 speed-lines-container">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute h-[1px] speed-line"
              style={{
                width: 30 + (i % 4) * 20,
                top: -6 + (i % 5) * 3,
                left: `${15 + (i * 11) % 70}%`,
                animationDelay: `${i * 0.06}s`,
              }} />
          ))}
        </div>

        {/* Airplane */}
        <div className="absolute airplane-element">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            {/* Airplane pointing RIGHT */}
            <g>
              {/* Fuselage */}
              <path d="M48 26 C48 24, 44 22, 38 22 L24 22 L16 12 L18 12 L24 20 L38 20 C45 20, 50 22, 50 26 C50 30, 45 32, 38 32 L24 32 L18 40 L16 40 L24 30 L38 30 C44 30, 48 28, 48 26Z"
                fill="hsl(160, 60%, 50%)" opacity="0.95" />
              {/* Tail */}
              <path d="M14 24 L8 24 L6 20 L8 20 L10 24 M14 28 L8 28 L6 32 L8 32 L10 28"
                fill="hsl(160, 60%, 42%)" opacity="0.8" />
              {/* Cockpit */}
              <ellipse cx="42" cy="26" rx="3" ry="2" fill="hsl(210, 40%, 70%)" opacity="0.7" />
            </g>
          </svg>

          {/* Engine glow */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-6 h-3 rounded-full blur-sm engine-glow"
            style={{ background: "linear-gradient(to left, hsl(160,60%,50%), transparent)" }} />
        </div>

        {/* Contrail */}
        <div className="absolute contrail-element">
          <div className="w-40 h-[2px] rounded-full blur-[1px]"
            style={{ background: "linear-gradient(to left, hsla(0,0%,100%,0.4), transparent)" }} />
        </div>
      </div>

      {/* Logo & text */}
      <div className="relative z-10 flex flex-col items-center gap-4 mt-2 logo-section">
        <img src={logoImg} alt="NatLeva" className="h-8 sm:h-10 object-contain opacity-90" style={{ filter: "brightness(0) invert(1)" }} />
        <div className="flex items-center gap-2">
          <p className="text-sm sm:text-base font-light tracking-[0.2em]"
            style={{ color: "hsl(158,12%,60%)" }}>
            Preparando sua jornada
          </p>
          <span className="flex gap-0.5">
            {[0, 1, 2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full animate-pulse"
                style={{ background: "hsl(160,60%,50%)", animationDelay: `${i * 0.3}s` }} />
            ))}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-48 h-[2px] rounded-full overflow-hidden"
          style={{ background: "hsl(158,30%,15%)" }}>
          <div className="h-full rounded-full progress-bar"
            style={{
              background: "linear-gradient(to right, hsl(160,60%,42%), hsl(160,60%,55%))",
              boxShadow: "0 0 8px hsla(160, 60%, 50%, 0.5)",
            }} />
        </div>
      </div>

      <style>{`
        /* ─── Airplane ─── */
        .airplane-element {
          bottom: 22px;
          left: 18%;
          animation: airplane-move 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }

        @keyframes airplane-move {
          0%   { left: 18%; bottom: 22px; transform: rotate(0deg) scale(1); opacity: 1; }
          20%  { left: 28%; bottom: 22px; transform: rotate(0deg) scale(1); opacity: 1; }
          50%  { left: 48%; bottom: 24px; transform: rotate(-2deg) scale(1); opacity: 1; }
          65%  { left: 58%; bottom: 50px; transform: rotate(-12deg) scale(1); opacity: 1; }
          78%  { left: 65%; bottom: 120px; transform: rotate(-18deg) scale(0.9); opacity: 1; }
          88%  { left: 72%; bottom: 200px; transform: rotate(-22deg) scale(0.7); opacity: 0.6; }
          94%  { left: 76%; bottom: 240px; transform: rotate(-25deg) scale(0.5); opacity: 0; }
          95%  { left: 18%; bottom: 22px; transform: rotate(0deg) scale(0); opacity: 0; }
          100% { left: 18%; bottom: 22px; transform: rotate(0deg) scale(1); opacity: 1; }
        }

        /* ─── Engine glow ─── */
        .engine-glow {
          animation: engine-pulse 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes engine-pulse {
          0%, 15% { opacity: 0; }
          25%     { opacity: 0.3; }
          50%     { opacity: 0.7; }
          65%     { opacity: 0.9; }
          88%     { opacity: 0.4; }
          94%, 100% { opacity: 0; }
        }

        /* ─── Contrail ─── */
        .contrail-element {
          bottom: 40px;
          left: 30%;
          opacity: 0;
          animation: contrail-move 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes contrail-move {
          0%, 58%  { opacity: 0; bottom: 30px; left: 40%; transform: rotate(0deg); }
          65%      { opacity: 0.4; bottom: 45px; left: 42%; transform: rotate(-12deg); }
          78%      { opacity: 0.5; bottom: 100px; left: 38%; transform: rotate(-18deg); }
          88%      { opacity: 0.2; bottom: 170px; left: 35%; transform: rotate(-22deg); }
          94%, 100% { opacity: 0; }
        }

        /* ─── Runway ─── */
        .runway-container {
          transform: translateX(-50%) perspective(600px) rotateX(4deg);
          animation: runway-fade 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes runway-fade {
          0%, 60% { opacity: 1; transform: translateX(-50%) perspective(600px) rotateX(4deg); }
          75%     { opacity: 0.5; transform: translateX(-50%) perspective(600px) rotateX(6deg); }
          88%     { opacity: 0; }
          95%     { opacity: 0; }
          100%    { opacity: 1; transform: translateX(-50%) perspective(600px) rotateX(4deg); }
        }

        /* ─── Runway dashes ─── */
        .runway-dash {
          background-color: hsla(160, 60%, 50%, 0.25);
          animation: dash-glow 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes dash-glow {
          0%, 15% { background-color: hsla(160, 60%, 50%, 0.25); box-shadow: none; }
          30%     { background-color: hsla(160, 60%, 50%, 0.8); box-shadow: 0 0 6px hsla(160, 60%, 50%, 0.4); }
          70%     { background-color: hsla(160, 60%, 50%, 0.8); box-shadow: 0 0 6px hsla(160, 60%, 50%, 0.4); }
          88%, 100% { background-color: hsla(160, 60%, 50%, 0.25); box-shadow: none; }
        }

        /* ─── Runway lights ─── */
        .runway-light {
          background-color: hsla(160, 20%, 30%, 0.3);
          animation: light-glow 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes light-glow {
          0%, 15% { background-color: hsla(160, 20%, 30%, 0.3); box-shadow: none; }
          30%     { background-color: hsla(160, 60%, 50%, 0.6); box-shadow: 0 0 8px hsla(160, 60%, 50%, 0.6); }
          70%     { background-color: hsla(160, 60%, 50%, 0.6); box-shadow: 0 0 8px hsla(160, 60%, 50%, 0.6); }
          88%, 100% { background-color: hsla(160, 20%, 30%, 0.3); box-shadow: none; }
        }

        /* ─── Speed lines ─── */
        .speed-lines-container {
          animation: speed-container 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes speed-container {
          0%, 25% { opacity: 0; }
          35%     { opacity: 1; }
          65%     { opacity: 1; }
          75%, 100% { opacity: 0; }
        }

        .speed-line {
          background: linear-gradient(to right, transparent, hsl(160,60%,50%), transparent);
          animation: speed-streak 0.35s linear infinite;
        }
        @keyframes speed-streak {
          from { transform: translateX(80px); opacity: 0; }
          50%  { opacity: 0.5; }
          to   { transform: translateX(-160px); opacity: 0; }
        }

        /* ─── Progress bar ─── */
        .progress-bar {
          animation: progress-fill 5s ease-in-out infinite;
        }
        @keyframes progress-fill {
          0%   { width: 5%; }
          20%  { width: 20%; }
          50%  { width: 50%; }
          75%  { width: 80%; }
          90%  { width: 95%; }
          95%  { width: 100%; }
          96%  { width: 100%; opacity: 1; }
          98%  { opacity: 0.3; }
          100% { width: 5%; opacity: 1; }
        }

        /* ─── Logo section ─── */
        .logo-section {
          animation: logo-breathe 5s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        @keyframes logo-breathe {
          0%, 100% { opacity: 1; }
          92%      { opacity: 0.5; }
          96%      { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
