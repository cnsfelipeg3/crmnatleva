// Pure helpers used by the proposal analytics dashboard.
// No side effects · easy to test.

export const SECTION_LABELS: Record<string, string> = {
  hero: "Capa",
  intro: "Introdução",
  destinations: "Destinos",
  flights: "Voos",
  hotels: "Hotéis",
  cruises: "Cruzeiros",
  insurances: "Seguros",
  experiences: "Experiências",
  pricing: "Investimento",
  payment: "Pagamento",
  cta: "Próximo passo",
};

export const FUNNEL_ORDER = [
  "hero",
  "intro",
  "destinations",
  "flights",
  "hotels",
  "cruises",
  "insurances",
  "experiences",
  "pricing",
  "payment",
  "cta",
];

export type Viewer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  device_type: string | null;
  user_agent: string | null;
  total_views: number | null;
  total_time_seconds: number | null;
  active_seconds: number | null;
  engagement_score: number | null;
  scroll_depth_max: number | null;
  sections_viewed: string[] | null;
  cta_clicked: boolean | null;
  whatsapp_clicked: boolean | null;
  city: string | null;
  region: string | null;
  country: string | null;
  first_viewed_at: string;
  last_active_at: string;
};

export type Interaction = {
  id: string;
  viewer_id: string;
  event_type: string;
  section_name: string | null;
  event_data: Record<string, any> | null;
  created_at: string;
};

export type ClickEvent = {
  id: string;
  viewer_id: string | null;
  section_name: string | null;
  target_tag: string | null;
  target_text: string | null;
  rel_x: number;
  rel_y: number;
  device_type: string | null;
  created_at: string;
};

export function isOnline(viewer: Viewer): boolean {
  const ageMs = Date.now() - new Date(viewer.last_active_at).getTime();
  return ageMs < 60_000;
}

export function returnRate(viewers: Viewer[]): number {
  if (viewers.length === 0) return 0;
  const returning = viewers.filter((v) => (v.total_views || 1) >= 2).length;
  return Math.round((returning / viewers.length) * 100);
}

export function avgScrollDepth(viewers: Viewer[]): number {
  if (viewers.length === 0) return 0;
  const sum = viewers.reduce((s, v) => s + (v.scroll_depth_max || 0), 0);
  return Math.round(sum / viewers.length);
}

export function avgTimePerVisit(viewers: Viewer[]): number {
  const total = viewers.reduce((s, v) => s + (v.total_time_seconds || 0), 0);
  const visits = viewers.reduce((s, v) => s + (v.total_views || 1), 0);
  return visits > 0 ? Math.round(total / visits) : 0;
}

export function deviceBreakdown(viewers: Viewer[]): { mobile: number; desktop: number; tablet: number } {
  const out = { mobile: 0, desktop: 0, tablet: 0 };
  for (const v of viewers) {
    const d = (v.device_type || "desktop").toLowerCase();
    if (d === "mobile") out.mobile++;
    else if (d === "tablet") out.tablet++;
    else out.desktop++;
  }
  return out;
}

export function dominantDevice(viewers: Viewer[]): { type: string; pct: number } {
  if (viewers.length === 0) return { type: "·", pct: 0 };
  const b = deviceBreakdown(viewers);
  const entries = Object.entries(b) as [keyof typeof b, number][];
  const [topType, topCount] = entries.sort((a, b) => b[1] - a[1])[0];
  return { type: topType, pct: Math.round((topCount / viewers.length) * 100) };
}

export function geoBreakdown(viewers: Viewer[]): { key: string; city: string; country: string; count: number }[] {
  const map = new Map<string, { city: string; country: string; count: number }>();
  for (const v of viewers) {
    const city = v.city || "Localização desconhecida";
    const country = v.country || "";
    const key = `${city}|${country}`;
    const cur = map.get(key) || { city, country, count: 0 };
    cur.count++;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.count - a.count);
}

/** % of unique viewers that reached each section in FUNNEL_ORDER. */
export function sectionFunnel(viewers: Viewer[]): { section: string; label: string; count: number; pct: number }[] {
  const total = viewers.length || 1;
  return FUNNEL_ORDER.map((section) => {
    const count = viewers.filter((v) => (v.sections_viewed || []).includes(section)).length;
    return {
      section,
      label: SECTION_LABELS[section] || section,
      count,
      pct: Math.round((count / total) * 100),
    };
  });
}

/** Time per section, summed across viewers. */
export function timePerSection(interactions: Interaction[]): { section: string; label: string; seconds: number }[] {
  const acc = new Map<string, number>();
  for (const i of interactions) {
    if (i.event_type === "time_on_section" && i.section_name) {
      const sec = Number(i.event_data?.seconds) || 0;
      acc.set(i.section_name, (acc.get(i.section_name) || 0) + sec);
    }
  }
  return Array.from(acc.entries())
    .map(([section, seconds]) => ({
      section,
      label: SECTION_LABELS[section] || section,
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** Hourly visualizations across the last N days. */
export function hourlyActivity(interactions: Interaction[], days = 7): { hour: string; views: number }[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const buckets = new Map<string, number>();
  for (const i of interactions) {
    if (i.event_type !== "page_view" && i.event_type !== "section_view") continue;
    const t = new Date(i.created_at).getTime();
    if (t < cutoff) continue;
    const d = new Date(i.created_at);
    const key = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}h`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  // Sort chronologically by extracting from key
  return Array.from(buckets.entries())
    .map(([hour, views]) => ({ hour, views }))
    .slice(-48); // cap to 48 buckets for chart readability
}

/** Hour of day with most activity (0-23). */
export function peakHour(interactions: Interaction[]): { hour: number; count: number } | null {
  const buckets = new Array(24).fill(0);
  let any = false;
  for (const i of interactions) {
    if (i.event_type !== "page_view" && i.event_type !== "section_view") continue;
    const h = new Date(i.created_at).getHours();
    buckets[h]++;
    any = true;
  }
  if (!any) return null;
  let max = 0;
  let hour = 0;
  for (let h = 0; h < 24; h++) {
    if (buckets[h] > max) {
      max = buckets[h];
      hour = h;
    }
  }
  return { hour, count: max };
}

/** Top clicked targets with frequency and percentage. */
export function topClickedTargets(clicks: ClickEvent[], limit = 8): { label: string; count: number; pct: number }[] {
  if (clicks.length === 0) return [];
  const map = new Map<string, number>();
  for (const c of clicks) {
    const label = (c.target_text || c.target_tag || "elemento").trim().slice(0, 80);
    if (!label) continue;
    map.set(label, (map.get(label) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, pct: Math.round((count / clicks.length) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function formatTime(seconds: number): string {
  if (!seconds || seconds < 0) return "·";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}

export function parseUA(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "·", os: "·" };
  let browser = "Outro";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  let os = "Outro";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  return { browser, os };
}

/** Auto-generated insights based on heuristics. Always returns something useful. */
export function generateInsights(
  viewers: Viewer[],
  interactions: Interaction[],
  clicks: ClickEvent[],
): { tone: "info" | "success" | "warning"; title: string; detail: string }[] {
  const out: { tone: "info" | "success" | "warning"; title: string; detail: string }[] = [];

  if (viewers.length === 0) {
    out.push({
      tone: "info",
      title: "Aguardando o primeiro acesso",
      detail: "Envie a proposta para o cliente e os indicadores aparecem aqui em tempo real.",
    });
    return out;
  }

  // Hot lead
  const hot = viewers.filter((v) => (v.engagement_score || 0) >= 60 && !(v.cta_clicked));
  if (hot.length > 0) {
    const v = hot.sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))[0];
    out.push({
      tone: "warning",
      title: `${v.name || v.email} está engajado mas não clicou no CTA`,
      detail: `Score ${v.engagement_score}%. Bom momento pra enviar uma mensagem com gatilho de urgência.`,
    });
  }

  // Return visitor
  const returning = viewers.filter((v) => (v.total_views || 1) >= 3);
  if (returning.length > 0) {
    const v = returning[0];
    out.push({
      tone: "success",
      title: `${v.name || v.email} voltou ${v.total_views}x na proposta`,
      detail: "Sinal forte de interesse. Vale chamar no WhatsApp pra tirar dúvidas e fechar.",
    });
  }

  // Peak hour
  const peak = peakHour(interactions);
  if (peak && peak.count >= 3) {
    out.push({
      tone: "info",
      title: `Pico de acessos às ${String(peak.hour).padStart(2, "0")}h`,
      detail: `Cliente costuma abrir nesse horário · ideal pra mandar follow-up logo antes.`,
    });
  }

  // Device dominance
  const dev = dominantDevice(viewers);
  if (dev.pct >= 70 && viewers.length >= 3) {
    const label = dev.type === "mobile" ? "mobile" : dev.type === "tablet" ? "tablet" : "desktop";
    out.push({
      tone: "info",
      title: `${dev.pct}% dos acessos vieram de ${label}`,
      detail: "Confira como a proposta aparece nesse formato pra garantir que tá impecável.",
    });
  }

  // Drop-off in funnel
  const funnel = sectionFunnel(viewers);
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1];
    const cur = funnel[i];
    if (prev.count >= 3 && cur.count <= prev.count * 0.4) {
      out.push({
        tone: "warning",
        title: `Queda de interesse em ${cur.label}`,
        detail: `Só ${cur.pct}% dos visitantes chegam aqui depois de ${prev.label}. Vale revisar essa seção.`,
      });
      break;
    }
  }

  // Click activity
  if (clicks.length === 0 && viewers.length >= 2) {
    out.push({
      tone: "warning",
      title: "Ninguém interagiu clicando ainda",
      detail: "Visualizações sem cliques pode indicar que o cliente está só navegando. CTAs mais visíveis ajudam.",
    });
  }

  // CTA performance
  const ctaCount = viewers.filter((v) => v.cta_clicked).length;
  if (ctaCount > 0) {
    const pct = Math.round((ctaCount / viewers.length) * 100);
    out.push({
      tone: "success",
      title: `Taxa de conversão de CTA: ${pct}%`,
      detail: `${ctaCount} de ${viewers.length} visitantes clicou em chamada de ação.`,
    });
  }

  return out.slice(0, 6);
}
