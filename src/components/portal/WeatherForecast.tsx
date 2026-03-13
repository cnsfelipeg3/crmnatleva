import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, CloudLightning, Wind, Droplets, Thermometer, RefreshCw, CloudFog, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/* ═══ TYPES ═══ */
interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

interface WeatherDay {
  date: string;
  dayOfWeek: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
}

interface WeatherData {
  current: WeatherCurrent;
  daily: WeatherDay[];
  locationName: string;
  country: string;
  updatedAt: string;
}

/* ═══ WMO WEATHER CODES ═══ */
const weatherDescriptions: Record<number, string> = {
  0: "Céu Limpo", 1: "Predominantemente Limpo", 2: "Parcialmente Nublado", 3: "Nublado",
  45: "Nevoeiro", 48: "Nevoeiro com Geada", 51: "Garoa Leve", 53: "Garoa Moderada",
  55: "Garoa Intensa", 56: "Garoa Congelante", 57: "Garoa Congelante Intensa",
  61: "Chuva Leve", 63: "Chuva Moderada", 65: "Chuva Forte",
  66: "Chuva Congelante", 67: "Chuva Congelante Forte",
  71: "Neve Leve", 73: "Neve Moderada", 75: "Neve Forte", 77: "Granizo",
  80: "Pancadas Leves", 81: "Pancadas Moderadas", 82: "Pancadas Fortes",
  85: "Neve Leve", 86: "Neve Forte",
  95: "Trovoada", 96: "Trovoada com Granizo", 99: "Trovoada com Granizo Forte",
};

function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function getWeatherBg(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay
    ? "from-sky-400 via-blue-400 to-blue-500"
    : "from-indigo-900 via-blue-900 to-slate-900";
  if (code === 2) return isDay
    ? "from-sky-400 via-blue-300 to-slate-400"
    : "from-indigo-800 via-slate-800 to-slate-900";
  if (code === 3) return "from-slate-400 via-slate-500 to-gray-500";
  if (code >= 45 && code <= 48) return "from-gray-400 via-slate-400 to-gray-500";
  if (code >= 51 && code <= 82) return "from-slate-500 via-blue-500 to-slate-600";
  if (code >= 85 && code <= 86) return "from-blue-200 via-slate-300 to-blue-300";
  if (code >= 95) return "from-slate-700 via-gray-700 to-slate-800";
  return "from-slate-400 via-slate-500 to-gray-500";
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/* ═══ IATA → CITY MAP ═══ */
const iataCityMap: Record<string, string> = {
  GRU: "São Paulo", CGH: "São Paulo", GIG: "Rio de Janeiro", SDU: "Rio de Janeiro",
  BSB: "Brasília", SSA: "Salvador", REC: "Recife", FOR: "Fortaleza", CWB: "Curitiba",
  POA: "Porto Alegre", BEL: "Belém", MAO: "Manaus", FLN: "Florianópolis", NAT: "Natal",
  MCZ: "Maceió", VCP: "Campinas", CNF: "Belo Horizonte", JPA: "João Pessoa",
  MIA: "Miami", JFK: "New York", LAX: "Los Angeles", ORD: "Chicago", SFO: "San Francisco",
  MCO: "Orlando", LAS: "Las Vegas", EWR: "Newark", ATL: "Atlanta", DFW: "Dallas",
  LHR: "London", CDG: "Paris", FCO: "Roma", MAD: "Madrid", BCN: "Barcelona",
  AMS: "Amsterdam", FRA: "Frankfurt", MUC: "Munich", ZRH: "Zurich", LIS: "Lisboa",
  OPO: "Porto", MXP: "Milan", VCE: "Venice", ATH: "Athens", IST: "Istanbul",
  DXB: "Dubai", DOH: "Doha", AUH: "Abu Dhabi", CAI: "Cairo", JNB: "Johannesburg",
  NRT: "Tokyo", HND: "Tokyo", ICN: "Seoul", HKG: "Hong Kong", SIN: "Singapore",
  BKK: "Bangkok", KUL: "Kuala Lumpur", DPS: "Bali", SYD: "Sydney", MEL: "Melbourne",
  AKL: "Auckland", SCL: "Santiago", EZE: "Buenos Aires", AEP: "Buenos Aires",
  BOG: "Bogotá", LIM: "Lima", CUN: "Cancún", MEX: "Mexico City", PUJ: "Punta Cana",
  PMI: "Palma de Mallorca", TLV: "Tel Aviv", AMM: "Amman", CMB: "Colombo",
  MLE: "Maldives", RAK: "Marrakech", CPT: "Cape Town",
};

function getDestinationCity(sale: any, segments: any[]): string | null {
  if (sale?.destination_iata && iataCityMap[sale.destination_iata]) return iataCityMap[sale.destination_iata];
  if (sale?.destination_iata) return sale.destination_iata;
  if (segments?.length > 0) {
    const lastSeg = segments[segments.length - 1];
    const arrIata = lastSeg?.arrival_iata || lastSeg?.destination_iata;
    if (arrIata && iataCityMap[arrIata]) return iataCityMap[arrIata];
    if (arrIata) return arrIata;
  }
  return null;
}

/* ═══ CACHE ═══ */
const CACHE_KEY = "natleva_weather_cache";
const CACHE_TTL = 30 * 60 * 1000;

function getCachedWeather(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[city.toLowerCase()];
    if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCachedWeather(city: string, data: WeatherData) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[city.toLowerCase()] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

/* ═══ API ═══ */
async function fetchWeather(cityName: string): Promise<WeatherData> {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt`);
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error("Cidade não encontrada");
  const { latitude, longitude, name, country } = geoData.results[0];

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=10`
  );
  const weather = await weatherRes.json();

  const daily: WeatherDay[] = weather.daily.time.map((date: string, i: number) => {
    const d = new Date(date + "T12:00:00");
    return {
      date,
      dayOfWeek: DAY_NAMES[d.getDay()],
      tempMax: Math.round(weather.daily.temperature_2m_max[i]),
      tempMin: Math.round(weather.daily.temperature_2m_min[i]),
      weatherCode: weather.daily.weather_code[i],
      precipitationProbability: weather.daily.precipitation_probability_max?.[i] ?? 0,
    };
  });

  return {
    current: {
      temperature: Math.round(weather.current.temperature_2m),
      apparentTemperature: Math.round(weather.current.apparent_temperature),
      humidity: Math.round(weather.current.relative_humidity_2m),
      windSpeed: Math.round(weather.current.wind_speed_10m),
      weatherCode: weather.current.weather_code,
      isDay: weather.current.is_day === 1,
    },
    daily,
    locationName: name,
    country,
    updatedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/* ═══ TEMP BAR ═══ */
function TempBar({ min, max, globalMin, globalMax }: { min: number; max: number; globalMin: number; globalMax: number }) {
  const range = globalMax - globalMin || 1;
  const left = ((min - globalMin) / range) * 100;
  const width = ((max - min) / range) * 100;
  return (
    <div className="relative h-1 w-full rounded-full bg-white/20 overflow-hidden">
      <div
        className="absolute h-full rounded-full"
        style={{
          left: `${left}%`,
          width: `${Math.max(width, 4)}%`,
          background: "linear-gradient(90deg, #60a5fa, #fbbf24, #f97316)",
        }}
      />
    </div>
  );
}

/* ═══ SKELETON ═══ */
function WeatherSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-b from-sky-400 to-blue-500 p-6 space-y-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-5 w-28 bg-white/20 rounded-full" />
        <Skeleton className="h-20 w-32 bg-white/20 rounded-full" />
        <Skeleton className="h-4 w-36 bg-white/20 rounded-full" />
      </div>
      <div className="rounded-2xl bg-white/15 backdrop-blur-md p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full bg-white/10 rounded-lg" />
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
  const [cityName, setCityName] = useState<string | null>(null);

  const loadWeather = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    const cached = getCachedWeather(city);
    if (cached) { setWeather(cached); setLoading(false); return; }
    try {
      const data = await fetchWeather(city);
      setWeather(data);
      setCachedWeather(city, data);
    } catch { setError("Não foi possível carregar a previsão."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const city = getDestinationCity(sale, segments);
    setCityName(city);
    if (city) loadWeather(city);
    else { setLoading(false); setError("Destino ainda não definido."); }
  }, [sale, segments, loadWeather]);

  if (loading) return <WeatherSkeleton />;

  if (error || !weather) {
    return (
      <div className="rounded-3xl bg-gradient-to-b from-slate-400 to-slate-500 p-8 text-center text-white">
        <Cloud className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm opacity-80">{error || "Previsão indisponível"}</p>
        {cityName && (
          <button onClick={() => loadWeather(cityName)} className="mt-4 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-auto">
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
      {/* ── Hero: Current Weather ── */}
      <div className="relative px-6 pt-6 pb-4 text-center">
        {/* Refresh button */}
        <button
          onClick={() => cityName && loadWeather(cityName)}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>

        <p className="text-sm font-semibold tracking-wide opacity-90">
          {weather.locationName}
        </p>
        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">{weather.country}</p>

        <div className="text-7xl sm:text-8xl font-extralight leading-none tracking-tighter my-1">
          {current.temperature}°
        </div>

        <p className="text-sm font-medium opacity-90">{description}</p>

        <div className="flex items-center justify-center gap-1 mt-1 text-xs opacity-60">
          <span>Máx.: {daily[0]?.tempMax}°</span>
          <span>·</span>
          <span>Mín.: {daily[0]?.tempMin}°</span>
        </div>
      </div>

      {/* ── Details Row ── */}
      <div className="mx-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
        <div className="grid grid-cols-4 divide-x divide-white/10 py-3">
          {[
            { icon: <Thermometer className="h-3.5 w-3.5" />, label: "Sensação", value: `${current.apparentTemperature}°` },
            { icon: <Droplets className="h-3.5 w-3.5" />, label: "Umidade", value: `${current.humidity}%` },
            { icon: <Wind className="h-3.5 w-3.5" />, label: "Vento", value: `${current.windSpeed} km/h` },
            { icon: <Eye className="h-3.5 w-3.5" />, label: "Atualizado", value: weather.updatedAt },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 px-2">
              <span className="opacity-50">{item.icon}</span>
              <span className="text-[10px] opacity-50 uppercase tracking-wider">{item.label}</span>
              <span className="text-xs font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 10-Day Forecast ── */}
      <div className="mx-4 mt-3 mb-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 overflow-hidden">
        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-medium flex items-center gap-1.5">
            📅 Previsão {daily.length} dias
          </p>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {daily.map((day, i) => {
            const isToday = i === 0;
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.03 * i }}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                {/* Day name */}
                <span className={cn(
                  "text-xs font-semibold w-10 shrink-0",
                  isToday ? "opacity-100" : "opacity-70"
                )}>
                  {isToday ? "Hoje" : day.dayOfWeek}
                </span>

                {/* Rain probability */}
                <span className="flex items-center gap-0.5 text-[10px] text-sky-200 w-10 shrink-0">
                  {day.precipitationProbability > 0 ? (
                    <>
                      <Droplets className="h-2.5 w-2.5" />
                      {day.precipitationProbability}%
                    </>
                  ) : <span className="opacity-0">—</span>}
                </span>

                {/* Weather emoji */}
                <span className="text-base shrink-0">{getWeatherEmoji(day.weatherCode)}</span>

                {/* Min temp */}
                <span className="text-xs opacity-50 w-7 text-right shrink-0">{day.tempMin}°</span>

                {/* Temperature bar */}
                <div className="flex-1 min-w-0 px-1">
                  <TempBar min={day.tempMin} max={day.tempMax} globalMin={globalMin} globalMax={globalMax} />
                </div>

                {/* Max temp */}
                <span className="text-xs font-semibold w-7 shrink-0">{day.tempMax}°</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
