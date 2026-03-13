import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Cloud, CloudRain, CloudSnow, Sun, CloudSun, CloudLightning, Wind, Droplets, Thermometer, Eye, RefreshCw, MapPin, CloudFog } from "lucide-react";
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
  0: "Céu limpo", 1: "Predominantemente limpo", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Nevoeiro", 48: "Nevoeiro com geada", 51: "Garoa leve", 53: "Garoa moderada",
  55: "Garoa intensa", 56: "Garoa congelante", 57: "Garoa congelante intensa",
  61: "Chuva leve", 63: "Chuva moderada", 65: "Chuva forte",
  66: "Chuva congelante leve", 67: "Chuva congelante forte",
  71: "Neve leve", 73: "Neve moderada", 75: "Neve forte", 77: "Granizo",
  80: "Pancadas leves", 81: "Pancadas moderadas", 82: "Pancadas fortes",
  85: "Neve leve", 86: "Neve forte",
  95: "Trovoada", 96: "Trovoada com granizo leve", 99: "Trovoada com granizo forte",
};

function getWeatherIcon(code: number, size: string = "h-5 w-5") {
  if (code === 0 || code === 1) return <Sun className={cn(size, "text-amber-400")} />;
  if (code === 2) return <CloudSun className={cn(size, "text-amber-300")} />;
  if (code === 3) return <Cloud className={cn(size, "text-muted-foreground")} />;
  if (code >= 45 && code <= 48) return <CloudFog className={cn(size, "text-muted-foreground")} />;
  if (code >= 51 && code <= 57) return <CloudRain className={cn(size, "text-info")} />;
  if (code >= 61 && code <= 67) return <CloudRain className={cn(size, "text-info")} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={cn(size, "text-info/70")} />;
  if (code >= 80 && code <= 82) return <CloudRain className={cn(size, "text-info")} />;
  if (code >= 85 && code <= 86) return <CloudSnow className={cn(size, "text-info/70")} />;
  if (code >= 95) return <CloudLightning className={cn(size, "text-warning")} />;
  return <Cloud className={cn(size, "text-muted-foreground")} />;
}

function getWeatherEmoji(code: number): string {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

function getWeatherGradient(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay
    ? "from-amber-400/10 via-orange-300/5 to-transparent"
    : "from-indigo-500/10 via-blue-400/5 to-transparent";
  if (code === 2) return "from-amber-300/8 via-sky-200/5 to-transparent";
  if (code === 3) return "from-slate-300/10 via-gray-200/5 to-transparent";
  if (code >= 51 && code <= 82) return "from-blue-400/10 via-sky-300/5 to-transparent";
  if (code >= 71 && code <= 86) return "from-blue-200/10 via-indigo-100/5 to-transparent";
  if (code >= 95) return "from-yellow-400/8 via-gray-300/5 to-transparent";
  return "from-muted/10 to-transparent";
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
  // Try sale destination IATA
  if (sale?.destination_iata && iataCityMap[sale.destination_iata]) {
    return iataCityMap[sale.destination_iata];
  }
  // Try sale name for city clues
  if (sale?.destination_iata) return sale.destination_iata;
  // Try last segment arrival
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
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedWeather(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[city.toLowerCase()];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
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

/* ═══ API FETCH ═══ */
async function fetchWeather(cityName: string): Promise<WeatherData> {
  // Geocode city
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error("Cidade não encontrada");

  const { latitude, longitude, name, country } = geoData.results[0];

  // Fetch weather
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

/* ═══ LOADING SKELETON ═══ */
function WeatherSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <Skeleton className="h-16 w-24 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-16 rounded-xl flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
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

    // Check cache first
    const cached = getCachedWeather(city);
    if (cached) {
      setWeather(cached);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchWeather(city);
      setWeather(data);
      setCachedWeather(city, data);
    } catch {
      setError("Não foi possível carregar a previsão do tempo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const city = getDestinationCity(sale, segments);
    setCityName(city);
    if (city) loadWeather(city);
    else {
      setLoading(false);
      setError("Destino da viagem ainda não definido.");
    }
  }, [sale, segments, loadWeather]);

  if (loading) return <WeatherSkeleton />;

  if (error || !weather) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
        <Cloud className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{error || "Previsão indisponível"}</p>
        {cityName && (
          <button
            onClick={() => loadWeather(cityName)}
            className="mt-3 text-xs text-accent font-semibold hover:underline flex items-center gap-1.5 mx-auto"
          >
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const { current, daily } = weather;
  const gradient = getWeatherGradient(current.weatherCode, current.isDay);
  const description = weatherDescriptions[current.weatherCode] || "Clima variável";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/40 bg-card overflow-hidden"
    >
      {/* ── Current Weather ── */}
      <div className={cn("relative p-5 sm:p-6 overflow-hidden")}>
        <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />

        <div className="relative">
          {/* Location */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" />
              <div>
                <p className="text-sm font-bold text-foreground">{weather.locationName}</p>
                <p className="text-[10px] text-muted-foreground">{weather.country}</p>
              </div>
            </div>
            <button
              onClick={() => cityName && loadWeather(cityName)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              title="Atualizar previsão"
            >
              <RefreshCw className="h-3 w-3" />
              {weather.updatedAt}
            </button>
          </div>

          {/* Main temp + description */}
          <div className="flex items-center gap-5 sm:gap-8">
            <div className="flex items-start gap-1">
              {getWeatherIcon(current.weatherCode, "h-10 w-10 sm:h-12 sm:w-12")}
              <span className="text-5xl sm:text-6xl font-black text-foreground tracking-tighter leading-none">
                {current.temperature}°
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm sm:text-base font-semibold text-foreground">{description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Thermometer className="h-3 w-3" /> Sensação {current.apparentTemperature}°C
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Droplets className="h-3 w-3" /> {current.humidity}%
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Wind className="h-3 w-3" /> {current.windSpeed} km/h
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Daily Forecast ── */}
      <div className="border-t border-border/30 p-4 sm:p-5">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.3em] font-medium mb-3">
          Próximos {daily.length} dias
        </p>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1">
          {daily.map((day, i) => {
            const isToday = i === 0;
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-2.5 px-2.5 sm:px-3 rounded-xl min-w-[56px] sm:min-w-[64px] transition-all flex-shrink-0",
                  isToday
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                )}
              >
                <span className={cn(
                  "text-[10px] sm:text-[11px] font-bold uppercase tracking-wider",
                  isToday ? "text-accent" : "text-muted-foreground"
                )}>
                  {isToday ? "Hoje" : day.dayOfWeek}
                </span>
                <span className="text-lg sm:text-xl">{getWeatherEmoji(day.weatherCode)}</span>
                <div className="text-center">
                  <p className="text-xs sm:text-sm font-bold text-foreground">{day.tempMax}°</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{day.tempMin}°</p>
                </div>
                {day.precipitationProbability > 0 && (
                  <span className="flex items-center gap-0.5 text-[9px] text-info font-medium">
                    <Droplets className="h-2.5 w-2.5" />
                    {day.precipitationProbability}%
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
