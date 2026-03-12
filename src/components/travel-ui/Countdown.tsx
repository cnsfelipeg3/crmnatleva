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
      <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] mb-2 font-medium">Embarque em</p>
      <div className="flex items-baseline gap-0">
        {[
          { v: d, l: "d" }, { v: h, l: "h" }, { v: m, l: "m" }, { v: s, l: "s" },
        ].map((x, i) => (
          <span key={i} className="flex items-baseline">
            <span className="text-white font-extralight text-4xl sm:text-6xl tabular-nums tracking-tight">
              {String(x.v).padStart(2, "0")}
            </span>
            <span className="text-white/20 text-xs font-medium mr-2 sm:mr-3">{x.l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
