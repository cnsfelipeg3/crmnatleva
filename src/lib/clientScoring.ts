/**
 * Score NatLeva (0–100) — Motor de Inteligência de Clientes
 * 
 * 5 pilares com pesos:
 * - Valor (Receita histórica): 25%
 * - Lucratividade (Margem média): 25%
 * - Frequência (Viagens/ano): 20%
 * - Recência (Última compra): 15%
 * - Potencial (Tendência crescimento): 15%
 */

export interface ClientSale {
  id: string; name: string; status: string; display_id: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  received_value: number; total_cost: number; profit: number; margin: number;
  products: string[]; airline: string | null;
  created_at: string; close_date: string | null;
  client_id: string | null; seller_id: string | null;
  is_international: boolean | null;
  origin_city: string | null; destination_city: string | null;
}

export interface ClientAnalysis {
  key: string; name: string; saleIds: string[]; sales: ClientSale[];
  totalRevenue: number; totalProfit: number; avgMargin: number;
  totalTrips: number; avgTicket: number; frequency: number;
  lastTrip: string | null; nextTrip: string | null; firstTrip: string | null;
  topDestination: string; topRegion: string; topProduct: string;
  ltv: number; daysInactive: number;
  revenue12m: number; revenue24m: number;
  originCity: string | null; isInternational: boolean;
  avgMonthsBetweenTrips: number;
  estimatedAnnualRevenue: number;
  // Scores (0-100)
  scoreValor: number;
  scoreLucratividade: number;
  scoreFrequencia: number;
  scoreRecencia: number;
  scorePotencial: number;
  scoreNatLeva: number;
  // Segmentation
  segmento: string;
  segmentoEmoji: string;
  // Clustering
  cluster: string;
  clusterColor: string;
  // Computed
  yearsActive: number;
  mostExpensiveTrip: number;
  cheapestTrip: number;
  destMap: Record<string, number>;
  regionMap: Record<string, number>;
  productMap: Record<string, number>;
}

// ─── Helpers ───

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/\s*-\s*(tassia|tássia|check-in|volta cancelada|cancelad[ao]|organico|orgânico).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPerson(name: string): boolean {
  const blacklist = ["kiwif", "kiwify", "banco", "nubank", "teste", "test", "admin", "sistema", "pagamento", "transferencia", "pix", "cartao"];
  const lower = name.toLowerCase();
  return !blacklist.some(b => lower.includes(b)) && name.length > 3;
}

export function getRegion(iata: string | null): string {
  if (!iata) return "Desconhecido";
  const eu = ["LIS","CDG","FCO","BCN","MAD","LHR","AMS","FRA","MUC","ZRH","VIE","PRG","IST","MXP","NAP","VCE","GVA","OPO","DUB","CPH","OSL","ARN","HEL","WAW","BUD","ATH","SOF"];
  const na = ["JFK","MIA","MCO","LAX","SFO","EWR","BOS","ATL","ORD","DFW","YYZ","LAS","PHX","DEN","SEA","IAD","IAH","MSP","DTW","PHL","CLT","TPA","FLL","SAN","PDX","YVR","YUL"];
  const me = ["DXB","DOH","AUH","JED","RUH","AMM","TLV","CAI","CMN"];
  const asia = ["NRT","HND","ICN","PEK","SIN","BKK","HKG","KUL","DPS","TPE","PVG","DEL","BOM","MNL","SGN","HAN","KTM"];
  const carib = ["CUN","PUJ","SXM","AUA","CUR","NAS","MBJ","SJU","HAV","SDQ","BOG","LIM","SCL","EZE","MVD","UIO","CTG","PTY"];
  const africa = ["JNB","CPT","NBO","CMN","CAI","ADD","ACC","LOS","DAR","MRU"];
  const oceania = ["SYD","MEL","AKL","NAN"];
  if (eu.includes(iata)) return "Europa";
  if (na.includes(iata)) return "América do Norte";
  if (me.includes(iata)) return "Oriente Médio";
  if (asia.includes(iata)) return "Ásia";
  if (carib.includes(iata)) return "Caribe/LatAm";
  if (africa.includes(iata)) return "África";
  if (oceania.includes(iata)) return "Oceania";
  return "Brasil";
}

// ─── Score Calculations ───

function calcScoreValor(totalGasto: number, maiorGastoBase: number): number {
  if (maiorGastoBase <= 0) return 0;
  return Math.min(100, Math.max(0, (totalGasto / maiorGastoBase) * 100));
}

function calcScoreLucratividade(margemMedia: number): number {
  if (margemMedia >= 30) return 100;
  if (margemMedia >= 20) return 80;
  if (margemMedia >= 15) return 60;
  if (margemMedia >= 10) return 40;
  return 20;
}

function calcScoreFrequencia(viagensPorAno: number, maiorFrequencia: number): number {
  if (maiorFrequencia <= 0) return 0;
  return Math.min(100, Math.max(0, (viagensPorAno / maiorFrequencia) * 100));
}

function calcScoreRecencia(diasDesdeUltimaCompra: number): number {
  if (diasDesdeUltimaCompra < 90) return 100;
  if (diasDesdeUltimaCompra < 180) return 70;
  if (diasDesdeUltimaCompra < 365) return 40;
  return 10;
}

function calcScorePotencial(revenue12m: number, revenue24m: number): number {
  // Compare last 12m vs previous 12m (revenue24m - revenue12m)
  const prev12m = revenue24m - revenue12m;
  if (prev12m <= 0 && revenue12m > 0) return 100; // New customer growing
  if (prev12m <= 0) return 50;
  const ratio = revenue12m / prev12m;
  if (ratio > 1.1) return 100;  // Growing
  if (ratio > 0.9) return 70;   // Stable
  return 40; // Declining
}

function calcScoreNatLeva(valor: number, lucro: number, freq: number, recencia: number, potencial: number): number {
  return Math.round(
    valor * 0.25 +
    lucro * 0.25 +
    freq * 0.20 +
    recencia * 0.15 +
    potencial * 0.15
  );
}

// ─── Segmentation ───

export function getSegmento(score: number): { label: string; emoji: string } {
  if (score >= 85) return { label: "VIP Elite", emoji: "🏆" };
  if (score >= 70) return { label: "VIP Premium", emoji: "💎" };
  if (score >= 55) return { label: "Cliente Estratégico", emoji: "⭐" };
  if (score >= 40) return { label: "Cliente Recorrente", emoji: "🔁" };
  if (score >= 25) return { label: "Cliente Potencial", emoji: "🌱" };
  return { label: "Cliente em Risco", emoji: "⚠️" };
}

// ─── Clustering ───

export function getCluster(c: {
  avgTicket: number; frequency: number; avgMargin: number;
  totalTrips: number; topRegion: string; daysInactive: number;
  isInternational: boolean; totalRevenue: number;
}): { label: string; color: string } {
  // Churn Risk first
  if (c.daysInactive > 365 && c.totalTrips >= 2) return { label: "Risco de Churn", color: "hsl(0, 72%, 51%)" };
  
  // Luxury Frequent
  if (c.avgTicket > 8000 && c.frequency >= 2 && c.avgMargin >= 15) return { label: "Luxo Frequente", color: "hsl(280, 60%, 50%)" };
  
  // Family Premium
  if (c.avgTicket > 5000 && c.totalTrips >= 2 && (c.topRegion === "América do Norte" || c.topRegion === "Caribe/LatAm" || c.topRegion === "Europa"))
    return { label: "Família Premium", color: "hsl(210, 80%, 52%)" };
  
  // High Ticket Low Frequency
  if (c.avgTicket > 10000 && c.frequency < 1.5) return { label: "Alto Ticket Baixa Freq.", color: "hsl(38, 92%, 50%)" };
  
  // Special Experience
  if (c.isInternational && c.avgMargin >= 20 && c.totalTrips >= 1) return { label: "Experiência Especial", color: "hsl(158, 60%, 38%)" };

  // Economical Recurring
  if (c.avgTicket < 5000 && c.frequency >= 1.5) return { label: "Econômico Recorrente", color: "hsl(160, 60%, 42%)" };

  // New/Occasional
  if (c.totalTrips === 1) return { label: "Novo/Ocasional", color: "hsl(190, 70%, 45%)" };

  return { label: "Perfil Misto", color: "hsl(220, 15%, 55%)" };
}

// ─── Main Analysis Engine ───

export function analyzeClients(sales: ClientSale[]): ClientAnalysis[] {
  const now = new Date();
  const m12 = new Date(now.getTime() - 365 * 86400000);
  const m24 = new Date(now.getTime() - 730 * 86400000);

  const groups: Record<string, ClientSale[]> = {};
  const displayNames: Record<string, string> = {};

  sales.forEach(sale => {
    if (!sale.name || !isPerson(sale.name)) return;
    const key = normalizeName(sale.name);
    if (!key || key.length < 3) return;
    if (!groups[key]) { groups[key] = []; displayNames[key] = sale.name; }
    if (sale.name.length > displayNames[key].length) displayNames[key] = sale.name;
    groups[key].push(sale);
  });

  // First pass: compute raw values for normalization
  const rawClients = Object.entries(groups).map(([key, cs]) => {
    const totalRevenue = cs.reduce((a, s) => a + (s.received_value || 0), 0);
    const totalCost = cs.reduce((a, s) => a + (s.total_cost || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = cs.length > 0 ? cs.reduce((a, s) => a + (s.margin || 0), 0) / cs.length : 0;
    const avgTicket = cs.length > 0 ? totalRevenue / cs.length : 0;

    const destMap: Record<string, number> = {};
    const regionMap: Record<string, number> = {};
    const productMap: Record<string, number> = {};
    let hasInternational = false;
    let originCity: string | null = null;

    cs.forEach(s => {
      if (s.destination_iata) {
        destMap[s.destination_iata] = (destMap[s.destination_iata] || 0) + 1;
        const r = getRegion(s.destination_iata);
        regionMap[r] = (regionMap[r] || 0) + 1;
      }
      (s.products || []).forEach(p => { productMap[p] = (productMap[p] || 0) + 1; });
      if (s.is_international) hasInternational = true;
      if (s.origin_city && !originCity) originCity = s.origin_city;
    });

    const topDestination = Object.entries(destMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    const dates = cs.map(s => s.departure_date || s.close_date).filter(Boolean).map(d => new Date(d!));
    const pastDates = dates.filter(d => d < now).sort((a, b) => b.getTime() - a.getTime());
    const futureDates = dates.filter(d => d >= now).sort((a, b) => a.getTime() - b.getTime());
    const lastTrip = pastDates[0]?.toISOString().slice(0, 10) || null;
    const nextTrip = futureDates[0]?.toISOString().slice(0, 10) || null;
    const firstDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const firstTrip = firstDate?.toISOString().slice(0, 10) || null;
    const daysInactive = lastTrip ? Math.floor((now.getTime() - new Date(lastTrip).getTime()) / 86400000) : 9999;

    const yearsActive = firstDate ? Math.max(0.5, (now.getTime() - firstDate.getTime()) / (365 * 86400000)) : 1;
    const frequency = cs.length / yearsActive;

    let avgMonthsBetweenTrips = 0;
    if (pastDates.length >= 2) {
      const sorted = [...pastDates].sort((a, b) => a.getTime() - b.getTime());
      let totalGap = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalGap += (sorted[i].getTime() - sorted[i - 1].getTime()) / (30 * 86400000);
      }
      avgMonthsBetweenTrips = totalGap / (sorted.length - 1);
    }

    const revenue12m = cs.filter(s => {
      const d = s.close_date || s.created_at;
      return d && new Date(d) >= m12;
    }).reduce((a, s) => a + (s.received_value || 0), 0);

    const revenue24m = cs.filter(s => {
      const d = s.close_date || s.created_at;
      return d && new Date(d) >= m24;
    }).reduce((a, s) => a + (s.received_value || 0), 0);

    const annualRevenue = totalRevenue / Math.max(yearsActive, 0.5);
    const ltv = annualRevenue * 5;

    const tripValues = cs.map(s => s.received_value || 0).filter(v => v > 0);
    const mostExpensiveTrip = tripValues.length > 0 ? Math.max(...tripValues) : 0;
    const cheapestTrip = tripValues.length > 0 ? Math.min(...tripValues) : 0;

    return {
      key, name: displayNames[key], saleIds: cs.map(s => s.id), sales: cs,
      totalRevenue, totalProfit, avgMargin, totalTrips: cs.length,
      avgTicket, frequency, lastTrip, nextTrip, firstTrip,
      topDestination, topRegion, topProduct,
      ltv, daysInactive, revenue12m, revenue24m,
      originCity, isInternational: hasInternational,
      avgMonthsBetweenTrips, estimatedAnnualRevenue: annualRevenue,
      yearsActive, mostExpensiveTrip, cheapestTrip,
      destMap, regionMap, productMap,
    };
  });

  // Find max values for normalization
  const maxRevenue = Math.max(...rawClients.map(c => c.totalRevenue), 1);
  const maxFrequency = Math.max(...rawClients.map(c => c.frequency), 1);

  // Second pass: compute scores
  return rawClients.map(c => {
    const scoreValor = calcScoreValor(c.totalRevenue, maxRevenue);
    const scoreLucratividade = calcScoreLucratividade(c.avgMargin);
    const scoreFrequencia = calcScoreFrequencia(c.frequency, maxFrequency);
    const scoreRecencia = calcScoreRecencia(c.daysInactive);
    const scorePotencial = calcScorePotencial(c.revenue12m, c.revenue24m);
    const scoreNatLeva = calcScoreNatLeva(scoreValor, scoreLucratividade, scoreFrequencia, scoreRecencia, scorePotencial);

    const seg = getSegmento(scoreNatLeva);
    const cluster = getCluster({
      avgTicket: c.avgTicket, frequency: c.frequency, avgMargin: c.avgMargin,
      totalTrips: c.totalTrips, topRegion: c.topRegion, daysInactive: c.daysInactive,
      isInternational: c.isInternational, totalRevenue: c.totalRevenue,
    });

    return {
      ...c,
      scoreValor, scoreLucratividade, scoreFrequencia, scoreRecencia, scorePotencial, scoreNatLeva,
      segmento: seg.label, segmentoEmoji: seg.emoji,
      cluster: cluster.label, clusterColor: cluster.color,
    };
  }).sort((a, b) => b.scoreNatLeva - a.scoreNatLeva);
}
