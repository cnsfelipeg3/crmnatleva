/**
 * ConversationIntelligencePanel — Real-time intelligence extraction from simulator conversations
 * Displays structured travel fields and tags as they're detected
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  MapPin, Calendar, Users, Wallet, Clock, Plane, Hotel, Sparkles,
  Globe, Heart, Shield, Tag, TrendingUp, AlertTriangle, Baby, Compass,
} from "lucide-react";

interface Message {
  content: string;
  role: string;
  agentName?: string;
  timestamp?: string | number;
}

interface Props {
  messages: Message[];
  className?: string;
}

// ── Date extraction ──
const MONTH_MAP: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, marco: 3, abril: 4, maio: 5,
  junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10,
  novembro: 11, dezembro: 12, jan: 1, fev: 2, mar: 3, abr: 4,
  mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function extractDates(text: string): string[] {
  const dates: string[] = [];
  // "março 2027", "setembro/27", "julho de 2026"
  const ptMonthYear = Array.from(text.matchAll(/\b([a-záàâãéèêíïóôõúüçñ]+)\s*(?:de\s+|\/)?(\d{2,4})\b/gi));
  for (const m of ptMonthYear) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month) {
      const year = m[2].length === 2 ? `20${m[2]}` : m[2];
      dates.push(`${String(month).padStart(2, "0")}/${year}`);
    }
  }
  // DD/MM/YYYY or DD/MM/YY
  const ddmm = Array.from(text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g));
  for (const m of ddmm) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    dates.push(`${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${year}`);
  }
  return [...new Set(dates)];
}

// ── Duration extraction ──
function extractDuration(text: string): string | null {
  const m = text.match(/(\d+)\s*(?:a\s*(\d+))?\s*(?:dias|noites|diárias)/i);
  if (m) return m[2] ? `${m[1]}-${m[2]} dias` : `${m[1]} dias`;
  const w = text.match(/(\d+)\s*semanas?/i);
  if (w) return `${w[1]} semana${parseInt(w[1]) > 1 ? "s" : ""}`;
  return null;
}

// ── Passenger count ──
function extractPassengers(text: string): { count: string | null; details: string | null } {
  const countMatch = text.match(/(?:somos|seremos|são|grupo\s*de|pra)\s*(\d+)\s*(?:pessoas?|adultos?|pax)?/i);
  const kidMatch = text.match(/(\d+)\s*(?:filhos?|crianças?|kids?)/i);
  const coupleMatch = /\bcasal\b/i.test(text);
  const count = countMatch ? countMatch[1] : coupleMatch ? "2" : null;
  const kids = kidMatch ? `${kidMatch[1]} criança${parseInt(kidMatch[1]) > 1 ? "s" : ""}` : null;
  return { count, details: kids };
}

// ── Origin extraction ──
function extractOrigin(text: string): string | null {
  const m = text.match(/(?:sou|moro|moramos|saindo|partindo)\s*(?:de|do|da|em)\s+([A-ZÀ-Ú][a-záàâãéèêíïóôõúüçñ]+(?:\s+[A-ZÀ-Ú][a-záàâãéèêíïóôõúüçñ]+)?)/);
  if (m) return m[1];
  const c = text.match(/(?:de|em)\s+(Curitiba|São Paulo|Rio de Janeiro|Belo Horizonte|Brasília|Salvador|Recife|Fortaleza|Porto Alegre|Florianópolis|Manaus|Belém|Goiânia|Campinas|Vitória|Natal|Maceió|João Pessoa|Aracaju|Cuiabá|Campo Grande|Teresina|São Luís)/i);
  return c ? c[1] : null;
}

// ── Name extraction ──
function extractClientName(text: string): string | null {
  const m = text.match(/(?:me\s+chamo?|meu\s+nome\s+é|pode\s+me\s+chamar\s+de|sou\s+[ao]?\s*)\s+([A-ZÀ-Ú][a-záàâãéèêíïóôõúüçñ]+(?:\s+[A-ZÀ-Ú][a-záàâãéèêíïóôõúüçñ]+)?)/i);
  return m ? m[1] : null;
}

// ── Destination extraction (enhanced) ──
const DEST_MAP: Record<string, string[]> = {
  "🇬🇧 Londres": ["londres", "london", "inglaterra"],
  "🇫🇷 Paris": ["paris", "frança"],
  "🇮🇹 Itália": ["itália", "italia", "roma", "milão", "veneza", "florença"],
  "🇪🇸 Espanha": ["espanha", "madrid", "barcelona"],
  "🇵🇹 Portugal": ["portugal", "lisboa", "porto"],
  "🇬🇷 Grécia": ["grécia", "grecia", "santorini", "mykonos", "atenas"],
  "🇦🇪 Dubai": ["dubai", "abu dhabi", "emirados"],
  "🇲🇻 Maldivas": ["maldivas", "maldives"],
  "🇺🇸 Orlando": ["orlando", "disney", "universal"],
  "🇺🇸 Nova York": ["nova york", "new york", "nyc", "manhattan"],
  "🇺🇸 Miami": ["miami"],
  "🇲🇽 Cancún": ["cancun", "cancún", "riviera maya"],
  "🇯🇵 Japão": ["japão", "japan", "tokyo", "tóquio", "kyoto"],
  "🇹🇭 Tailândia": ["tailândia", "bangkok", "phuket"],
  "🇮🇩 Bali": ["bali", "indonésia"],
  "🇪🇬 Egito": ["egito", "cairo"],
  "🇲🇦 Marrocos": ["marrocos", "marrakech"],
  "🇭🇷 Croácia": ["croácia", "dubrovnik"],
  "🇨🇭 Suíça": ["suíça", "zurique", "interlaken"],
  "🇹🇷 Turquia": ["turquia", "istambul", "capadócia"],
  "🇦🇷 Argentina": ["argentina", "buenos aires", "bariloche"],
  "🇨🇱 Chile": ["chile", "santiago"],
  "🇧🇷 Nordeste": ["nordeste", "salvador", "recife", "natal", "fortaleza", "maceió", "jericoacoara", "porto de galinhas"],
  "🇧🇷 Gramado": ["gramado", "serra gaúcha"],
  "🇧🇷 Noronha": ["noronha", "fernando de noronha"],
  "🏝️ Caribe": ["caribe", "caribbean", "punta cana", "aruba", "curaçao"],
  "🇳🇿 Nova Zelândia": ["nova zelândia", "new zealand"],
  "🇿🇦 África do Sul": ["africa do sul", "cape town", "safari"],
  "🇱🇰 Sri Lanka": ["sri lanka"],
  "🇵🇪 Peru": ["peru", "machu picchu", "cusco"],
  "🇨🇷 Costa Rica": ["costa rica"],
  "🌍 Europa": ["europa", "europe"],
  "🌏 Ásia": ["ásia", "asia"],
};

function extractDestinations(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [label, keywords] of Object.entries(DEST_MAP)) {
    if (keywords.some(kw => lower.includes(kw))) found.push(label);
  }
  return found;
}

// ── Budget extraction ──
function extractBudget(text: string): string | null {
  const specific = text.match(/(?:r\$|brl)\s*([\d.,]+)\s*(?:mil|k)?/i);
  if (specific) {
    const raw = specific[1].replace(/\./g, "").replace(",", ".");
    const val = parseFloat(raw);
    if (val > 0) return val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val.toFixed(0)}`;
  }
  const range = text.match(/(\d+)\s*(?:a|até|-)\s*(\d+)\s*(?:mil|k)/i);
  if (range) return `R$ ${range[1]}k - ${range[2]}k`;
  const mil = text.match(/(\d+)\s*mil/i);
  if (mil) return `R$ ${mil[1]}k`;
  if (/luxo|premium|5\s*estrelas|first\s*class/i.test(text)) return "💎 Premium";
  if (/econômic|barato|apertado|mais\s*em\s*conta/i.test(text)) return "💰 Econômico";
  return null;
}

// ── Airline extraction ──
function extractAirline(text: string): string | null {
  const airlines: Record<string, RegExp> = {
    "LATAM": /latam/i,
    "GOL": /\bgol\b/i,
    "Azul": /\bazul\b/i,
    "Emirates": /emirates/i,
    "Qatar Airways": /qatar/i,
    "Turkish Airlines": /turkish/i,
    "Air France": /air\s*france/i,
    "KLM": /\bklm\b/i,
    "Lufthansa": /lufthansa/i,
    "British Airways": /british\s*air/i,
    "TAP": /\btap\b/i,
    "American Airlines": /american\s*air/i,
    "Delta": /\bdelta\b/i,
    "United": /\bunited\b(?!\s*states)/i,
    "Iberia": /iberia/i,
    "Copa Airlines": /\bcopa\b/i,
    "Avianca": /avianca/i,
    "Swiss": /\bswiss\b/i,
    "Singapore Airlines": /singapore/i,
    "Etihad": /etihad/i,
  };
  for (const [name, regex] of Object.entries(airlines)) {
    if (regex.test(text)) return `✈️ ${name}`;
  }
  return null;
}

// ── Flight class extraction ──
function extractFlightClass(text: string): string | null {
  if (/primeira\s*classe|first\s*class/i.test(text)) return "👑 Primeira Classe";
  if (/executiva|business/i.test(text)) return "💼 Executiva";
  if (/premium\s*econom/i.test(text)) return "⭐ Premium Economy";
  if (/econômica|economy/i.test(text)) return "💺 Econômica";
  return null;
}

// ── Airport extraction ──
function extractAirport(text: string): string | null {
  const airports: Record<string, RegExp> = {
    "GRU - Guarulhos": /guarulhos|gru\b/i,
    "CGH - Congonhas": /congonhas|cgh\b/i,
    "GIG - Galeão": /galeão|galeao|gig\b/i,
    "SDU - Santos Dumont": /santos\s*dumont|sdu\b/i,
    "BSB - Brasília": /\bbsb\b/i,
    "CWB - Curitiba": /\bcwb\b|afonso\s*pena/i,
    "CNF - Confins": /confins|cnf\b/i,
    "POA - Porto Alegre": /\bpoa\b|salgado\s*filho/i,
    "SSA - Salvador": /\bssa\b/i,
    "REC - Recife": /\brec\b/i,
    "VCP - Campinas": /viracopos|vcp\b/i,
  };
  for (const [name, regex] of Object.entries(airports)) {
    if (regex.test(text)) return name;
  }
  return null;
}

// ── Flight time preference ──
function extractFlightTimePreference(text: string): string | null {
  if (/voo\s*(?:que\s*)?(?:sai|saindo|partindo)?\s*(?:de|à)?\s*noite|noturno/i.test(text)) return "🌙 Voo noturno";
  if (/voo\s*(?:que\s*)?(?:sai|saindo)?\s*(?:de|pela)?\s*manhã|matutino|cedo/i.test(text)) return "🌅 Voo matutino";
  if (/voo\s*(?:que\s*)?(?:sai|saindo)?\s*(?:à|de)?\s*tarde/i.test(text)) return "🌇 Voo à tarde";
  if (/(?:sem\s*escala|direto|non.?stop)/i.test(text)) return "⚡ Voo direto";
  if (/escala|conexão/i.test(text)) return "🔄 Aceita conexão";
  return null;
}

// ── Baggage ──
function extractBaggage(text: string): string | null {
  const m = text.match(/(\d+)\s*(?:malas?|despacho|bagagem)/i);
  if (m) return `🧳 ${m[1]} mala${parseInt(m[1]) > 1 ? "s" : ""} despachada${parseInt(m[1]) > 1 ? "s" : ""}`;
  if (/bastante\s*mala|muita\s*bagagem/i.test(text)) return "🧳 Bagagem extra";
  return null;
}

// ── Visa/Documents ──
function extractDocumentation(text: string): string[] {
  const docs: string[] = [];
  if (/passaporte\s*(?:em\s*dia|válido|ok|vence)/i.test(text)) docs.push("🛂 Passaporte OK");
  if (/visto/i.test(text)) docs.push("📄 Visto necessário");
  if (/seguro\s*viagem/i.test(text)) docs.push("🛡️ Seguro viagem");
  if (/vacina|febre\s*amarela/i.test(text)) docs.push("💉 Vacinação");
  return docs;
}

// ── Trip type ──
function extractTripType(text: string): string | null {
  if (/lua\s*de\s*mel|honeymoon|recém\s*casad/i.test(text)) return "💑 Lua de Mel";
  if (/formatura/i.test(text)) return "🎓 Formatura";
  if (/aniversári|bodas|comemoraç/i.test(text)) return "🎂 Celebração";
  if (/corporativ|negócio|reunião|congress/i.test(text)) return "🏢 Corporativo";
  if (/aventura|radical|trilha|mergulho/i.test(text)) return "🏔️ Aventura";
  if (/relax|descanso|spa|resort|all\s*inclusive/i.test(text)) return "🏖️ Relax";
  if (/safári|safari/i.test(text)) return "🦁 Safari";
  if (/cruzeiro|navio/i.test(text)) return "🚢 Cruzeiro";
  if (/famíli|filhos?|crianças?/i.test(text)) return "👨‍👩‍👧‍👦 Família";
  if (/grupo|amigos|turma|galera/i.test(text)) return "👥 Grupo";
  if (/casal/i.test(text)) return "💑 Casal";
  if (/sozinho|solo|mochil/i.test(text)) return "🧳 Solo";
  return null;
}

// ── Preferences ──
function extractPreferences(text: string): string[] {
  const prefs: string[] = [];
  if (/hotel|hospedagem|resort|pousada/i.test(text)) {
    if (/5\s*estrelas/i.test(text)) prefs.push("⭐ Hotel 5 estrelas");
    else if (/4\s*estrelas/i.test(text)) prefs.push("⭐ Hotel 4 estrelas");
    if (/cozinha|kitchenette/i.test(text)) prefs.push("🍳 Hotel com cozinha");
    if (/perto\s*d[eo]s?\s*parque/i.test(text)) prefs.push("📍 Perto dos parques");
    if (/all\s*inclusive/i.test(text)) prefs.push("🍹 All Inclusive");
    if (/piscina/i.test(text)) prefs.push("🏊 Com piscina");
  }
  if (/executiva|business|primeira\s*classe/i.test(text)) prefs.push("✈️ Classe executiva");
  if (/econômica|economy/i.test(text)) prefs.push("✈️ Classe econômica");
  if (/direto|sem\s*escala/i.test(text)) prefs.push("✈️ Voo direto");
  if (/seguro\s*viagem/i.test(text)) prefs.push("🛡️ Seguro viagem");
  if (/transfer|traslado/i.test(text)) prefs.push("🚐 Transfer");
  if (/aluguel\s*(?:de\s*)?carro/i.test(text)) prefs.push("🚗 Aluguel de carro");
  if (/guia|passeio\s*guiado/i.test(text)) prefs.push("🗺️ Passeio guiado");
  if (/desconto|promoç/i.test(text)) prefs.push("🏷️ Busca desconto");
  if (/parcelamento|parcela/i.test(text)) prefs.push("💳 Quer parcelar");
  return prefs;
}

// ── Sentiment signals ──
function extractSentimentSignals(text: string): { signal: string; emoji: string }[] {
  const signals: { signal: string; emoji: string }[] = [];
  if (/urgente|urgência|preciso\s*rápido|amanhã|semana\s*que\s*vem/i.test(text)) signals.push({ signal: "Urgência detectada", emoji: "⚡" });
  if (/caro|preço\s*alto|meio\s*caro|acima\s*do\s*mercado|outra\s*agência/i.test(text)) signals.push({ signal: "Sensível a preço", emoji: "💸" });
  if (/confiável|referência|garantia|reclame\s*aqui/i.test(text)) signals.push({ signal: "Precisa de confiança", emoji: "🛡️" });
  if (/comparando|cotação|outra|concorrência/i.test(text)) signals.push({ signal: "Comparando concorrentes", emoji: "⚖️" });
  if (/insatisfeito|decepcion|horrível|péssimo|reclamação/i.test(text)) signals.push({ signal: "Insatisfeito", emoji: "😤" });
  if (/empolgad|ansios|mal\s*posso\s*esperar|sonho/i.test(text)) signals.push({ signal: "Empolgado", emoji: "🤩" });
  if (/indecis|não\s*sei|dúvida|qual\s*seria/i.test(text)) signals.push({ signal: "Indeciso", emoji: "🤔" });
  if (/medo|receio|preocupad/i.test(text)) signals.push({ signal: "Receoso", emoji: "😰" });
  return signals;
}

// ── Scoring ──
function calcCompleteness(fields: Record<string, any>): number {
  const weights: Record<string, number> = {
    name: 7, destinations: 12, dates: 10, passengers: 7, budget: 10,
    tripType: 7, origin: 5, duration: 5, preferences: 5, signals: 3,
    airline: 7, flightClass: 5, airport: 5, flightTime: 4, baggage: 4, documentation: 4,
  };
  let score = 0;
  if (fields.name) score += weights.name;
  if (fields.destinations.length > 0) score += weights.destinations;
  if (fields.dates.length > 0) score += weights.dates;
  if (fields.passengers.count) score += weights.passengers;
  if (fields.budget) score += weights.budget;
  if (fields.tripType) score += weights.tripType;
  if (fields.origin) score += weights.origin;
  if (fields.duration) score += weights.duration;
  if (fields.preferences.length > 0) score += weights.preferences;
  if (fields.signals.length > 0) score += weights.signals;
  if (fields.airline) score += weights.airline;
  if (fields.flightClass) score += weights.flightClass;
  if (fields.airport) score += weights.airport;
  if (fields.flightTime) score += weights.flightTime;
  if (fields.baggage) score += weights.baggage;
  if (fields.documentation.length > 0) score += weights.documentation;
  return score;
}

// ── Table row component ──
function FieldRow({ icon: Icon, label, value, isNew }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | string[];
  isNew?: boolean;
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <tr className={cn(
      "border-b border-border/30 last:border-b-0 transition-colors",
      isNew && "bg-primary/5"
    )}>
      <td className="py-2 px-3 w-[110px] align-top">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("w-3.5 h-3.5 shrink-0", isNew ? "text-emerald-500" : "text-muted-foreground")} />
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">{label}</span>
        </div>
      </td>
      <td className="py-2 px-3 align-top">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-medium text-foreground">{display}</span>
          {isNew && (
            <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse bg-emerald-500/15 text-emerald-500">NEW</span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function ConversationIntelligencePanel({ messages, className }: Props) {
  const intelligence = useMemo(() => {
    const clientMessages = messages.filter(m => m.role === "user" || m.role === "lead" || m.role === "client");
    const allText = clientMessages.map(m => m.content).join(" ");
    const allTextFull = messages.map(m => m.content).join(" ");

    const destinations = extractDestinations(allTextFull);
    const dates = extractDates(allText);
    const duration = extractDuration(allText);
    const passengers = extractPassengers(allText);
    const origin = extractOrigin(allText);
    const name = extractClientName(allText);
    const budget = extractBudget(allText);
    const tripType = extractTripType(allText);
    const preferences = extractPreferences(allTextFull);
    const signals = extractSentimentSignals(allText);
    const airline = extractAirline(allText);
    const flightClass = extractFlightClass(allText);
    const airport = extractAirport(allText);
    const flightTime = extractFlightTimePreference(allText);
    const baggage = extractBaggage(allText);
    const documentation = extractDocumentation(allTextFull);

    const completeness = calcCompleteness({ name, destinations, dates, passengers, budget, tripType, origin, duration, preferences, signals, airline, flightClass, airport, flightTime, baggage, documentation });

    return { destinations, dates, duration, passengers, origin, name, budget, tripType, preferences, signals, completeness, airline, flightClass, airport, flightTime, baggage, documentation };
  }, [messages]);

  const { destinations, dates, duration, passengers, origin, name, budget, tripType, preferences, signals, completeness, airline, flightClass, airport, flightTime, baggage, documentation } = intelligence;

  const hasAnyData = name || destinations.length > 0 || dates.length > 0 || passengers.count ||
    budget || tripType || origin || duration || preferences.length > 0 || signals.length > 0 ||
    airline || flightClass || airport || flightTime || baggage || documentation.length > 0;

  return (
    <div className={cn("rounded-2xl overflow-hidden bg-card border border-border", className)}>
      {/* Header with completeness bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Inteligência</p>
          </div>
          <span className={cn(
            "text-[11px] font-extrabold tabular-nums",
            completeness >= 70 ? "text-emerald-600" : completeness >= 40 ? "text-amber-600" : "text-muted-foreground"
          )}>{completeness}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden mt-2 bg-muted/50">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${completeness}%`,
              background: completeness >= 70
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : completeness >= 40
                ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                : "linear-gradient(90deg, hsl(var(--muted-foreground)), hsl(var(--muted-foreground)))",
            }}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="p-2 space-y-0.5 max-h-[500px] overflow-y-auto custom-scrollbar">
        {!hasAnyData ? (
          <div className="text-center py-8 space-y-2">
            <Compass className="w-8 h-8 mx-auto text-muted-foreground/20" />
            <p className="text-[11px] text-muted-foreground">Aguardando conversa...</p>
            <p className="text-[9px] text-muted-foreground/70">Os campos serão preenchidos automaticamente</p>
          </div>
        ) : (
          <>
            {/* Core info */}
            <FieldRow icon={Users} label="Cliente" value={name || ""} />
            <FieldRow icon={MapPin} label="Origem" value={origin || ""} />
            <FieldRow icon={Globe} label="Destino" value={destinations} />
            <FieldRow icon={Calendar} label="Datas" value={dates} />
            <FieldRow icon={Clock} label="Duração" value={duration || ""} />
            <FieldRow icon={Users} label="Passageiros" value={
              passengers.count
                ? `${passengers.count} pessoa${parseInt(passengers.count) > 1 ? "s" : ""}${passengers.details ? ` (${passengers.details})` : ""}`
                : ""
            } />
            <FieldRow icon={Wallet} label="Orçamento" value={budget || ""} />
            <FieldRow icon={Heart} label="Tipo de Viagem" value={tripType || ""} />

            {/* Flight details section */}
            {(airline || flightClass || airport || flightTime || baggage) && (
              <div className="px-3 pt-2 pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <Plane className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
                  <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "#3B82F6" }}>Voo</p>
                </div>
                <div className="space-y-0.5 pl-1">
                   {airline && <p className="text-[11px] font-medium text-foreground/80">{airline}</p>}
                   {flightClass && <p className="text-[11px] font-medium text-foreground/80">{flightClass}</p>}
                   {airport && <p className="text-[11px] font-medium text-foreground/80">🛫 {airport}</p>}
                   {flightTime && <p className="text-[11px] font-medium text-foreground/80">{flightTime}</p>}
                   {baggage && <p className="text-[11px] font-medium text-foreground/80">{baggage}</p>}
                 </div>
              </div>
            )}

            {/* Documentation */}
            {documentation.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                   <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Documentação</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {documentation.map(d => (
                    <span key={d} className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                       {d}
                     </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences */}
            {preferences.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                   <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Preferências</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {preferences.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                       {p}
                     </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sentiment signals */}
            {signals.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                   <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">Sinais</p>
                </div>
                <div className="space-y-1">
                  {signals.map(s => (
                    <div key={s.signal} className="flex items-center gap-2 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/15">
                       <span className="text-sm">{s.emoji}</span>
                       <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">{s.signal}</span>
                     </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
