import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Cloud, Droplets, Wind, Thermometer, RefreshCw, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherData } from "./weather/types";
import { getWeatherBg, getDestinationCity, weatherDescriptions, getCachedWeather, setCachedWeather, fetchWeather } from "./weather/utils";
import WeatherSearch from "./weather/WeatherSearch";
import WeatherDayRow from "./weather/WeatherDayRow";

/* ═══ SKELETON ═══ */
function WeatherSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-sky-500 to-blue-600 p-6 space-y-5">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-4 w-24 bg-white/20 rounded-full" />
        <Skeleton className="h-20 w-36 bg-white/20 rounded-2xl" />
        <Skeleton className="h-4 w-32 bg-white/20 rounded-full" />
      </div>
      <div className="rounded-2xl bg-white/10 p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full bg-white/10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */
interface WeatherForecastProps {
  sale: any;
  segments: any[];
}

export default function WeatherForecast({ sale, segments }: WeatherForecastProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultCity, setDefaultCity] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const loadWeather = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    const cached = getCachedWeather(city);
    if (cached) { setWeather(cached); setActiveCity(city); setLoading(false); return; }
    try {
      const data = await fetchWeather(city);
      setWeather(data);
      setActiveCity(city);
      setCachedWeather(city, data);
    } catch { setError("Não foi possível carregar a previsão."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const city = getDestinationCity(sale, segments);
    setDefaultCity(city);
    if (city) loadWeather(city);
    else { setLoading(false); setError("Destino ainda não definido."); }
  }, [sale, segments, loadWeather]);

  if (loading) return <WeatherSkeleton />;

  if (error || !weather) {
    return (
      <div className="rounded-3xl bg-gradient-to-b from-slate-500 to-slate-600 p-8 text-center text-white">
        <Cloud className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm opacity-80">{error || "Previsão indisponível"}</p>
        {activeCity && (
          <button onClick={() => loadWeather(activeCity)} className="mt-4 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-auto">
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const { current, daily } = weather;
  const bg = getWeatherBg(current.weatherCode, current.isDay);
  const description = weatherDescriptions[current.weatherCode] || "Clima Variável";
  const globalMin = Math.min(...daily.map(d => d.tempMin));
  const globalMax = Math.max(...daily.map(d => d.tempMax));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn("rounded-3xl overflow-hidden bg-gradient-to-b text-white shadow-2xl", bg)}
    >
      {/* ── Hero ── */}
      <div className="relative px-6 pt-6 pb-4 text-center">
        <button
          onClick={() => activeCity && loadWeather(activeCity)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        <p className="text-sm font-bold tracking-wide drop-shadow-sm">
          {weather.locationName}
        </p>
        <p className="text-[10px] uppercase tracking-[0.15em] opacity-50 mb-1">{weather.country}</p>

        <div className="text-[80px] sm:text-[96px] font-extralight leading-none tracking-tighter my-1 drop-shadow-lg" style={{ textShadow: "0 2px 20px rgba(0,0,0,0.15)" }}>
          {current.temperature}°
        </div>

        <p className="text-sm font-semibold opacity-95 drop-shadow-sm">{description}</p>

        <div className="flex items-center justify-center gap-1.5 mt-1 text-[13px] font-medium opacity-70">
          <span>Máx: {daily[0]?.tempMax}°</span>
          <span className="opacity-40">·</span>
          <span>Mín: {daily[0]?.tempMin}°</span>
        </div>
      </div>

      {/* ── Detail metrics ── */}
      <div className="mx-4 rounded-2xl bg-white/[0.12] backdrop-blur-md border border-white/[0.08]">
        <div className="grid grid-cols-4 divide-x divide-white/[0.08] py-3">
          {[
            { icon: <Thermometer className="h-3.5 w-3.5" />, label: "Sensação", value: `${current.apparentTemperature}°` },
            { icon: <Droplets className="h-3.5 w-3.5" />, label: "Umidade", value: `${current.humidity}%` },
            { icon: <Wind className="h-3.5 w-3.5" />, label: "Vento", value: `${current.windSpeed} km/h` },
            { icon: <Eye className="h-3.5 w-3.5" />, label: "Atualizado", value: weather.updatedAt },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-2">
              <span className="text-white/50">{item.icon}</span>
              <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">{item.label}</span>
              <span className="text-[12px] font-bold text-white/90">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <WeatherSearch
        defaultCity={defaultCity}
        currentCity={activeCity || ""}
        onSelectCity={(city) => loadWeather(city)}
      />

      {/* ── 10-Day Forecast ── */}
      <div className="mx-4 mt-3 mb-4 rounded-2xl bg-white/[0.10] backdrop-blur-md border border-white/[0.08] overflow-hidden">
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-semibold flex items-center gap-1.5">
            📅 Previsão {daily.length} dias
          </p>
        </div>

        <div>
          {daily.map((day, i) => (
            <WeatherDayRow
              key={day.date}
              day={day}
              index={i}
              isToday={i === 0}
              isExpanded={expandedDay === day.date}
              onToggle={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
              globalMin={globalMin}
              globalMax={globalMax}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
