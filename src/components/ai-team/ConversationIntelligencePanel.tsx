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
  const ptMonthYear = text.matchAll(/\b([a-záàâãéèêíïóôõúüçñ]+)\s*(?:de\s+|\/)?(\d{2,4})\b/gi);
  for (const m of ptMonthYear) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month) {
      const year = m[2].length === 2 ? `20${m[2]}` : m[2];
      dates.push(`${String(month).padStart(2, "0")}/${year}`);
    }
  }
  // DD/MM/YYYY or DD/MM/YY
  const ddmm = text.matchAll(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g);
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
    name: 10, destinations: 20, dates: 15, passengers: 10, budget: 15,
    tripType: 10, origin: 5, duration: 5, preferences: 5, signals: 5,
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
  return score;
}

// ── Field row component ──
function FieldRow({ icon: Icon, label, value, isNew }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string | string[];
  isNew?: boolean;
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className={cn(
      "flex items-start gap-2.5 px-3 py-2 rounded-lg transition-all duration-500",
      isNew ? "bg-primary/10 border border-primary/20" : "bg-transparent"
    )}>
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: isNew ? "#10B981" : "#64748B" }} />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "#64748B" }}>{label}</p>
        <p className="text-[12px] font-medium mt-0.5" style={{ color: "#E2E8F0" }}>{display}</p>
      </div>
      {isNew && (
        <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-md animate-pulse"
          style={{ background: "rgba(16,185,129,0.15)", color: "#6EE7B7" }}>NEW</span>
      )}
    </div>
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

    const completeness = calcCompleteness({ name, destinations, dates, passengers, budget, tripType, origin, duration, preferences, signals });

    return { destinations, dates, duration, passengers, origin, name, budget, tripType, preferences, signals, completeness };
  }, [messages]);

  const { destinations, dates, duration, passengers, origin, name, budget, tripType, preferences, signals, completeness } = intelligence;

  const hasAnyData = name || destinations.length > 0 || dates.length > 0 || passengers.count ||
    budget || tripType || origin || duration || preferences.length > 0 || signals.length > 0;

  return (
    <div className={cn("rounded-2xl overflow-hidden bg-card border border-border", className)}>
      {/* Header with completeness bar */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#E2E8F0" }}>Inteligência</p>
          </div>
          <span className="text-[11px] font-extrabold tabular-nums" style={{
            color: completeness >= 70 ? "#10B981" : completeness >= 40 ? "#F59E0B" : "#64748B",
          }}>{completeness}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${completeness}%`,
              background: completeness >= 70
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : completeness >= 40
                ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                : "linear-gradient(90deg, #475569, #64748B)",
            }}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="p-2 space-y-0.5 max-h-[500px] overflow-y-auto custom-scrollbar">
        {!hasAnyData ? (
          <div className="text-center py-8 space-y-2">
            <Compass className="w-8 h-8 mx-auto" style={{ color: "rgba(255,255,255,0.08)" }} />
            <p className="text-[11px]" style={{ color: "#475569" }}>Aguardando conversa...</p>
            <p className="text-[9px]" style={{ color: "#334155" }}>Os campos serão preenchidos automaticamente</p>
          </div>
        ) : (
          <>
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

            {/* Preferences */}
            {preferences.length > 0 && (
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
                  <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "#64748B" }}>Preferências</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {preferences.map(p => (
                    <span key={p} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#C4B5FD", border: "1px solid rgba(139,92,246,0.15)" }}>
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
                  <TrendingUp className="w-3.5 h-3.5" style={{ color: "#64748B" }} />
                  <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: "#64748B" }}>Sinais</p>
                </div>
                <div className="space-y-1">
                  {signals.map(s => (
                    <div key={s.signal} className="flex items-center gap-2 px-2 py-1 rounded-md"
                      style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.1)" }}>
                      <span className="text-sm">{s.emoji}</span>
                      <span className="text-[10px] font-medium" style={{ color: "#FCD34D" }}>{s.signal}</span>
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
