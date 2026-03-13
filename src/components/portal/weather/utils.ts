import type { WeatherData, WeatherDay, WeatherHourly } from "./types";

/* ═══ WMO WEATHER CODES ═══ */
export const weatherDescriptions: Record<number, string> = {
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

export function getWeatherEmoji(code: number): string {
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

export function getWeatherBg(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay
    ? "from-sky-500 via-blue-500 to-blue-600"
    : "from-indigo-900 via-blue-950 to-slate-950";
  if (code === 2) return isDay
    ? "from-sky-500 via-blue-400 to-slate-500"
    : "from-indigo-900 via-slate-800 to-slate-900";
  if (code === 3) return "from-slate-500 via-slate-600 to-gray-600";
  if (code >= 45 && code <= 48) return "from-gray-500 via-slate-500 to-gray-600";
  if (code >= 51 && code <= 82) return "from-slate-600 via-blue-600 to-slate-700";
  if (code >= 85 && code <= 86) return "from-blue-300 via-slate-400 to-blue-400";
  if (code >= 95) return "from-slate-800 via-gray-800 to-slate-900";
  return "from-slate-500 via-slate-600 to-gray-600";
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* ═══ IATA → CITY MAP ═══ */
export const iataCityMap: Record<string, string> = {
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

export function getDestinationCity(sale: any, segments: any[]): string | null {
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
const CACHE_KEY = "natleva_weather_cache_v2";
const CACHE_TTL = 30 * 60 * 1000;

export function getCachedWeather(city: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const entry = cache[city.toLowerCase()];
    if (!entry || Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

export function setCachedWeather(city: string, data: WeatherData) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[city.toLowerCase()] = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

/* ═══ API ═══ */
export async function fetchWeather(cityName: string): Promise<WeatherData> {
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt`);
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error("Cidade não encontrada");
  const { latitude, longitude, name, country } = geoData.results[0];

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m,relative_humidity_2m` +
    `&timezone=auto&forecast_days=10`
  );
  const weather = await weatherRes.json();

  // Parse hourly data grouped by day
  const hourlyByDate: Record<string, WeatherHourly[]> = {};
  if (weather.hourly?.time) {
    weather.hourly.time.forEach((t: string, i: number) => {
      const dateKey = t.substring(0, 10);
      const hour = t.substring(11, 16);
      if (!hourlyByDate[dateKey]) hourlyByDate[dateKey] = [];
      hourlyByDate[dateKey].push({
        time: hour,
        temperature: Math.round(weather.hourly.temperature_2m[i]),
        apparentTemperature: Math.round(weather.hourly.apparent_temperature[i]),
        weatherCode: weather.hourly.weather_code[i],
        precipitationProbability: weather.hourly.precipitation_probability?.[i] ?? 0,
        windSpeed: Math.round(weather.hourly.wind_speed_10m?.[i] ?? 0),
        humidity: Math.round(weather.hourly.relative_humidity_2m?.[i] ?? 0),
      });
    });
  }

  const daily: WeatherDay[] = weather.daily.time.map((date: string, i: number) => {
    const d = new Date(date + "T12:00:00");
    return {
      date,
      dayOfWeek: DAY_NAMES[d.getDay()],
      dayOfMonth: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
      tempMax: Math.round(weather.daily.temperature_2m_max[i]),
      tempMin: Math.round(weather.daily.temperature_2m_min[i]),
      weatherCode: weather.daily.weather_code[i],
      precipitationProbability: weather.daily.precipitation_probability_max?.[i] ?? 0,
      hourly: hourlyByDate[date]?.filter((_, idx) => idx % 3 === 0) || [], // every 3 hours
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

/* ═══ GEO SEARCH ═══ */
export interface GeoResult {
  name: string;
  country: string;
  admin1?: string;
}

export async function searchCities(query: string): Promise<GeoResult[]> {
  if (query.length < 2) return [];
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt`);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    name: r.name,
    country: r.country,
    admin1: r.admin1,
  }));
}
