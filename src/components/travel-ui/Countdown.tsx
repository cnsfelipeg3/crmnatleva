import { useState, useEffect } from "react";

export function Countdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="mt-6">
      <p className="text-white/25 text-[9px] uppercase tracking-[0.4em] mb-3 font-bold">Embarque em</p>
      <div className="flex gap-1.5">
        {[
          { v: d, l: "dias" }, { v: h, l: "hrs" }, { v: m, l: "min" }, { v: s, l: "seg" },
        ].map((x, i) => (
          <div key={i} className="text-center">
            <div className="bg-white/[0.06] backdrop-blur-xl text-white font-bold text-xl sm:text-3xl px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl min-w-[40px] sm:min-w-[60px] tabular-nums border border-white/[0.05]">
              {String(x.v).padStart(2, "0")}
            </div>
            <span className="text-white/15 text-[8px] uppercase tracking-wider mt-1 block">{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
