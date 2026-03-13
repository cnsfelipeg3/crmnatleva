import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Droplets, Wind, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeatherEmoji } from "./utils";
import type { WeatherDay } from "./types";

interface TempBarProps {
  min: number; max: number; globalMin: number; globalMax: number;
}

function TempBar({ min, max, globalMin, globalMax }: TempBarProps) {
  const range = globalMax - globalMin || 1;
  const left = ((min - globalMin) / range) * 100;
  const width = ((max - min) / range) * 100;
  return (
    <div className="relative h-[5px] w-full rounded-full bg-white/15 overflow-hidden">
      <div
        className="absolute h-full rounded-full"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 5)}%`,
          background: "linear-gradient(90deg, #38bdf8, #facc15, #f97316)",
        }}
      />
    </div>
  );
}

interface WeatherDayRowProps {
  day: WeatherDay;
  index: number;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  globalMin: number;
  globalMax: number;
}

export default function WeatherDayRow({ day, index, isToday, isExpanded, onToggle, globalMin, globalMax }: WeatherDayRowProps) {
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      {/* Row header — clickable */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 sm:gap-3 px-4 py-3 transition-colors text-left group",
          isExpanded ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"
        )}
      >
        {/* Day name + date */}
        <div className="w-[72px] sm:w-20 shrink-0">
          <span className={cn("text-[13px] font-semibold block leading-tight", isToday ? "text-white" : "text-white/80")}>
            {isToday ? "Hoje" : day.dayOfWeek}
          </span>
          <span className="text-[10px] text-white/40 leading-tight">{day.dayOfMonth}</span>
        </div>

        {/* Rain probability */}
        <span className="flex items-center gap-0.5 text-[10px] text-sky-300/80 w-10 shrink-0">
          {day.precipitationProbability > 0 ? (
            <>
              <Droplets className="h-2.5 w-2.5" />
              {day.precipitationProbability}%
            </>
          ) : <span className="opacity-0">—</span>}
        </span>

        {/* Emoji */}
        <span className="text-lg shrink-0">{getWeatherEmoji(day.weatherCode)}</span>

        {/* Min */}
        <span className="text-[13px] text-white/45 w-8 text-right shrink-0 tabular-nums font-medium">{day.tempMin}°</span>

        {/* Temp bar */}
        <div className="flex-1 min-w-0 px-1">
          <TempBar min={day.tempMin} max={day.tempMax} globalMin={globalMin} globalMax={globalMax} />
        </div>

        {/* Max */}
        <span className="text-[13px] text-white font-bold w-8 shrink-0 tabular-nums">{day.tempMax}°</span>

        {/* Expand chevron */}
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-white/30 transition-transform duration-200 shrink-0",
          isExpanded && "rotate-180 text-white/60"
        )} />
      </button>

      {/* Expanded hourly detail */}
      <AnimatePresence>
        {isExpanded && day.hourly && day.hourly.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white/[0.05] px-4 py-3">
              {/* Horizontal scroll of hourly cards */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {day.hourly.map((h, hi) => (
                  <div
                    key={hi}
                    className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.08] border border-white/[0.06] px-3 py-2.5 min-w-[64px] shrink-0"
                  >
                    <span className="text-[10px] text-white/50 font-medium">{h.time}</span>
                    <span className="text-base">{getWeatherEmoji(h.weatherCode)}</span>
                    <span className="text-xs text-white font-bold tabular-nums">{h.temperature}°</span>
                    {h.precipitationProbability > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-sky-300/70">
                        <Droplets className="h-2 w-2" />
                        {h.precipitationProbability}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Extra details row */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {day.hourly.length > 0 && (() => {
                  const avgWind = Math.round(day.hourly.reduce((s, h) => s + h.windSpeed, 0) / day.hourly.length);
                  const avgHum = Math.round(day.hourly.reduce((s, h) => s + h.humidity, 0) / day.hourly.length);
                  const maxRain = Math.max(...day.hourly.map(h => h.precipitationProbability));
                  return (
                    <>
                      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-2">
                        <Wind className="h-3 w-3 text-white/40" />
                        <div>
                          <p className="text-[9px] text-white/35 uppercase tracking-wider">Vento</p>
                          <p className="text-[11px] text-white/80 font-semibold">{avgWind} km/h</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-2">
                        <Droplets className="h-3 w-3 text-white/40" />
                        <div>
                          <p className="text-[9px] text-white/35 uppercase tracking-wider">Umidade</p>
                          <p className="text-[11px] text-white/80 font-semibold">{avgHum}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-2">
                        <Thermometer className="h-3 w-3 text-white/40" />
                        <div>
                          <p className="text-[9px] text-white/35 uppercase tracking-wider">Chuva máx</p>
                          <p className="text-[11px] text-white/80 font-semibold">{maxRain}%</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
