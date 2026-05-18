import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Sparkles, MapPin, Plus, Search, ExternalLink, Eye, Users, Pencil, Calendar, BarChart3, Power, PowerOff, Trash2, TrendingUp, Crown, Handshake, ImageIcon, Banknote, PlaneTakeoff, BedDouble, Briefcase, Compass, ArrowRight } from "lucide-react";
import PrateleiraAnalyticsDialog from "@/components/prateleira/PrateleiraAnalyticsDialog";
import MarketingMediaDialog from "@/components/produtos/MarketingMediaDialog";
import PublicFooter from "@/components/prateleira/PublicFooter";
import logoNatleva from "@/assets/logo-natleva.webp";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";

type Product = any;

const KINDS = [
  { value: "all", label: "Todos" },
  { value: "pacote", label: "Pacotes" },
  { value: "aereo", label: "Aéreo" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "passeio", label: "Passeios" },
  { value: "cruzeiro", label: "Cruzeiros" },
  { value: "outros", label: "Outros" },
];

const STATUS = [
  { value: "all", label: "Todos status" },
  { value: "active", label: "Ativos" },
  { value: "draft", label: "Rascunhos" },
  { value: "paused", label: "Pausados" },
];

function fmtMoney(v?: number | null, c = "BRL") {
  if (v == null) return "-";
  const s = c === "USD" ? "US$" : c === "EUR" ? "€" : "R$";
  return `${s} ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}
function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd/MM/yy", { locale: ptBR }); } catch { return d; }
}

export default function Produtos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState(() => searchParams.get("kind") || "all");
  const [status, setStatus] = useState(() => searchParams.get("status") || "all");
  const [destination, setDestination] = useState(() => searchParams.get("destination") || "all");
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [onlyPromo, setOnlyPromo] = useState(() => searchParams.get("promo") === "1");
  const [paxFilter, setPaxFilter] = useState<string>(() => searchParams.get("pax") || "all");
  const [sortBy, setSortBy] = useState<"recent" | "commission_desc" | "commission_asc" | "price_asc" | "price_desc">(
    () => (searchParams.get("sort") as any) || "recent"
  );
  const [viewMode, setViewMode] = useState<"ceo" | "afiliado">(() => {
    const fromUrl = searchParams.get("mode");
    if (fromUrl === "ceo" || fromUrl === "afiliado") return fromUrl;
    if (typeof window === "undefined") return "ceo";
    return (localStorage.getItem("prateleira_view_mode") as "ceo" | "afiliado") || "ceo";
  });
  useEffect(() => {
    try { localStorage.setItem("prateleira_view_mode", viewMode); } catch {}
  }, [viewMode]);

  // Sync filters to URL so they can be shared and restored
  useEffect(() => {
    const params: Record<string, string> = {};
    if (kind !== "all") params.kind = kind;
    if (status !== "all") params.status = status;
    if (destination !== "all") params.destination = destination;
    if (q) params.q = q;
    if (onlyPromo) params.promo = "1";
    if (paxFilter !== "all") params.pax = paxFilter;
    if (sortBy !== "recent") params.sort = sortBy;
    if (viewMode !== "ceo") params.mode = viewMode;
    setSearchParams(params, { replace: true });
  }, [kind, status, destination, q, onlyPromo, paxFilter, sortBy, viewMode, setSearchParams]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*")
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const destinations = useMemo(() => Array.from(new Set(items.map((p) => p.destination))).sort(), [items]);

  const filtered = useMemo(() => {
    const arr = items.filter((p) => {
      if (kind !== "all" && (p.product_kind || "passeio") !== kind) return false;
      if (status !== "all" && (p.status || "active") !== status) return false;
      if (destination !== "all" && p.destination !== destination) return false;
      if (onlyPromo && !p.is_promo) return false;
      if (q && !`${p.title} ${p.short_description ?? ""} ${p.destination}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (paxFilter !== "all") {
        const totalPax = Math.max(1, (Number(p.pax_adults) || 0) + (Number(p.pax_children) || 0));
        if (paxFilter === "5") { if (totalPax < 5) return false; }
        else if (totalPax !== Number(paxFilter)) return false;
      }
      return true;
    });
    const priceOf = (p: any) => Number(p.price_promo) || Number(p.price_from) || 0;
    const commOf = (p: any) => Number(p.commission_per_sale) || 0;
    const sorted = arr.slice();
    if (sortBy === "commission_desc") sorted.sort((a, b) => commOf(b) - commOf(a));
    else if (sortBy === "commission_asc") sorted.sort((a, b) => commOf(a) - commOf(b));
    else if (sortBy === "price_asc") sorted.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === "price_desc") sorted.sort((a, b) => priceOf(b) - priceOf(a));
    return sorted;
  }, [items, kind, status, destination, q, onlyPromo, sortBy, paxFilter]);

  const totals = useMemo(() => {
    const totalProfit = items.reduce((s, p) => {
      const price = Number(p.price_promo) || Number(p.price_from) || 0;
      const isPP = (p.price_label || "").toLowerCase().includes("pessoa");
      const pax = Math.max(1, (Number(p.pax_adults) || 0) + (Number(p.pax_children) || 0));
      const revenue = isPP ? price * pax : price;
      const cost = Number(p.internal_cost) || 0;
      return s + (revenue - cost);
    }, 0);
    return {
      total: items.length,
      active: items.filter((p) => (p.status || "active") === "active" && p.is_active).length,
      promo: items.filter((p) => p.is_promo).length,
      leads: items.reduce((s, p) => s + (p.lead_count || 0), 0),
      views: items.reduce((s, p) => s + (p.view_count || 0), 0),
      profit: totalProfit,
    };
  }, [items]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, hsl(150 40% 6%) 0%, hsl(150 40% 12%) 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              aria-label="NatLeva"
              role="img"
              className="h-10 sm:h-12 w-40 sm:w-48"
              style={{
                backgroundColor: 'hsl(var(--champagne))',
                WebkitMaskImage: `url(${logoNatleva})`,
                maskImage: `url(${logoNatleva})`,
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'left center',
                maskPosition: 'left center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
            />
          </div>
          <div className="flex items-center gap-2 text-amber-300 text-xs font-medium tracking-widest uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" /> PROGRAMA DE BÔNUS - NATLEVA
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white leading-tight">Indique & Ganhe</h1>
              <p className="text-white/75 text-sm sm:text-[15px] mt-3 max-w-3xl leading-relaxed">
                Ganhar uma renda extra é muito mais simples do que você imagina! Você entra aqui, escolhe as viagens que quer divulgar (ou indica todas) e compartilha com a sua rede. Cada pacote já mostra o valor exato do seu bônus de indicação · quando alguém fechar a viagem com a gente, você recebe esse valor no Pix, no mesmo dia do fechamento.
              </p>
              <p className="text-amber-300/90 text-xs sm:text-[13px] mt-2 max-w-3xl leading-relaxed">
                Ex · indicou Punta del Este? Ganha R$ 332. Indicou o Iberostar Selection? Ganha R$ 900. O bônus aparece em cada card, é só escolher e compartilhar.
              </p>
              <div className="mt-3 inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 text-[11px] sm:text-xs font-semibold leading-snug">
                <Banknote className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                <span className="break-words">
                  Receba seu bônus ainda hoje, no PIX
                  <span className="hidden sm:inline"> · vale para todos os pacotes</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="inline-flex rounded-md border border-white/20 bg-white/10 backdrop-blur p-0.5">
                <button
                  onClick={() => setViewMode("ceo")}
                  className={cn(
                    "px-3 py-1.5 rounded-[5px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors",
                    viewMode === "ceo" ? "bg-amber-500 text-black" : "text-white/80 hover:text-white"
                  )}
                  title="Visão completa com lucro, custos e controles"
                >
                  <Crown className="w-3.5 h-3.5" /> Modo CEO
                </button>
                <button
                  onClick={() => setViewMode("afiliado")}
                  className={cn(
                    "px-3 py-1.5 rounded-[5px] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors",
                    viewMode === "afiliado" ? "bg-sky-500 text-white" : "text-white/80 hover:text-white"
                  )}
                  title="Visão do afiliado · apenas preços e comissão"
                >
                  <Handshake className="w-3.5 h-3.5" /> Modo Afiliado
                </button>
              </div>
              <a href="/p" target="_blank" rel="noreferrer">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20"><ExternalLink className="w-4 h-4 mr-1.5" /> Ver vitrine pública</Button>
              </a>
              {viewMode === "ceo" && (
                <Link to="/prateleira/novo">
                  <Button className="bg-amber-500 text-black hover:bg-amber-400"><Plus className="w-4 h-4 mr-1.5" /> Novo produto</Button>
                </Link>
              )}
            </div>
          </div>

          {/* KPI strip */}
          {viewMode === "ceo" && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6">
              <KPI label="Total" value={totals.total} />
              <KPI label="Ativos" value={totals.active} />
              <KPI label="Em promo" value={totals.promo} />
              <KPI label="Visualizações" value={totals.views} />
              <KPI label="Leads" value={totals.leads} />
              <KPI label="Lucro 🔒" value={fmtMoney(totals.profit)} highlight />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar título, destino..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-0 w-full lg:w-auto">
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-0 w-full lg:w-auto">
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-0 w-full lg:w-auto">
                <option value="all">Todos destinos</option>
                {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={paxFilter} onChange={(e) => setPaxFilter(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-0 w-full lg:w-auto" title="Filtrar por nº de pessoas">
                <option value="all">Qtd. pessoas</option>
                <option value="1">1 pessoa</option>
                <option value="2">2 pessoas</option>
                <option value="3">3 pessoas</option>
                <option value="4">4 pessoas</option>
                <option value="5">5+ pessoas</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-background border border-border rounded-md px-3 py-2 text-sm min-w-0 w-full lg:w-auto">
                <option value="recent">Mais recentes</option>
                <option value="commission_desc">Maior bônus</option>
                <option value="commission_asc">Menor bônus</option>
                <option value="price_asc">Menor preço</option>
                <option value="price_desc">Maior preço</option>
              </select>
              <button onClick={() => setOnlyPromo(!onlyPromo)}
                className={cn("px-3 py-2 rounded-md text-sm border flex items-center justify-center gap-1.5 w-full lg:w-auto",
                  onlyPromo ? "bg-amber-500 text-black border-amber-500" : "bg-background border-border")}>
                <Sparkles className="w-3.5 h-3.5" /> Promos
              </button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-sm mb-4">Nenhum produto cadastrado nessa visão.</p>
            <Link to="/prateleira/novo"><Button><Plus className="w-4 h-4 mr-1.5" /> Cadastrar primeiro produto</Button></Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <AdminProductCard
                key={p.id}
                p={p}
                viewMode={viewMode}
                onToggleActive={(next) =>
                  setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, is_active: next } : it)))
                }
                onDelete={() => setItems((prev) => prev.filter((it) => it.id !== p.id))}
              />
            ))}
          </div>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}

function KPI({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg px-4 py-3 backdrop-blur border", highlight ? "bg-amber-500/15 border-amber-300/30" : "bg-white/10 border-white/15")}>
      <div className={cn("text-[11px] uppercase tracking-wide", highlight ? "text-amber-200" : "text-white/60")}>{label}</div>
      <div className={cn("font-bold text-white", typeof value === "string" ? "text-lg" : "text-2xl")}>{value}</div>
    </div>
  );
}

function AdminProductCard({ p, viewMode, onToggleActive, onDelete }: { p: Product; viewMode: "ceo" | "afiliado"; onToggleActive: (next: boolean) => void; onDelete: () => void }) {
  const isAffiliate = viewMode === "afiliado";
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [savingActive, setSavingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isActive = p.is_active !== false;
  const promo = p.price_promo ? fmtMoney(p.price_promo, p.currency) : null;
  const full = p.price_from ? fmtMoney(p.price_from, p.currency) : null;
  const kind: string = (p.product_kind || "passeio").toLowerCase();
  const hasFlight = kind === "pacote" || kind === "aereo" || !!p.airline || !!p.origin_iata;
  const kindMeta: { label: string; Icon: any } =
    kind === "pacote" ? { label: "Pacote · Aéreo + Hospedagem", Icon: Briefcase }
    : kind === "aereo" ? { label: "Somente aéreo", Icon: PlaneTakeoff }
    : kind === "hospedagem" ? { label: "Somente hospedagem", Icon: BedDouble }
    : { label: "Experiência", Icon: Compass };
  const originLabel = hasFlight
    ? [p.origin_city, p.origin_iata ? `(${p.origin_iata})` : null].filter(Boolean).join(" ")
    : "";
  const depDate = fmtDate(p.departure_date);
  const retDate = fmtDate(p.return_date);
  const statusBadge = p.status === "draft" ? "secondary" : p.status === "paused" ? "outline" : "default";

  // Lucro estimado · uso interno
  const priceNum = Number(p.price_promo) || Number(p.price_from) || 0;
  const isPP = (p.price_label || "").toLowerCase().includes("pessoa");
  const paxCount = Math.max(1, (Number(p.pax_adults) || 0) + (Number(p.pax_children) || 0));
  const revenue = isPP ? priceNum * paxCount : priceNum;
  const cost = Number(p.internal_cost) || 0;
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const hasCost = cost > 0;
  const commission = Number(p.commission_per_sale) || 0;
  const hasCommission = commission > 0;

  async function handleToggleActive(next: boolean) {
    setSavingActive(true);
    onToggleActive(next); // optimistic
    const { error } = await (supabase as any)
      .from("experience_products")
      .update({ is_active: next })
      .eq("id", p.id);
    setSavingActive(false);
    if (error) {
      onToggleActive(!next); // rollback
      toast({ title: "Não rolou atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next ? "Produto ativado" : "Produto desativado",
      description: next
        ? "Voltou pra vitrine pública e a página de venda tá no ar."
        : "Sumiu da vitrine pública e a página de venda fica indisponível.",
    });
  }

  async function handleDelete() {
    const ok = window.confirm(`Excluir "${p.title}" da prateleira?\n\nEssa ação não pode ser desfeita.`);
    if (!ok) return;
    setDeleting(true);
    const { error } = await (supabase as any)
      .from("experience_products")
      .delete()
      .eq("id", p.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Não rolou excluir", description: error.message, variant: "destructive" });
      return;
    }
    onDelete();
    toast({ title: "Produto excluído", description: "Removido da vitrine." });
  }

  return (
    <Card className={cn("overflow-hidden flex flex-col p-0 transition-opacity", !isActive && "opacity-70")}>
      {hasCommission && (
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 px-3 py-2.5 flex items-center justify-between gap-2 shadow-sm border-b-2 border-emerald-400/40">
          <div className="flex items-center gap-2 min-w-0 relative">
            <div className="w-7 h-7 rounded-full bg-amber-300/95 flex items-center justify-center shrink-0 ring-2 ring-amber-200/60 shadow-md">
              <Banknote className="w-4 h-4 text-emerald-900" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-widest font-bold text-white/90 leading-none">Você ganha</div>
              <div className="text-[16px] font-extrabold tabular-nums leading-tight drop-shadow-sm mt-0.5 text-white">
                <span className="bonus-value">{fmtMoney(commission, p.currency)}</span>
                <span className="text-[11px] font-semibold text-white/85 ml-1">por venda</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/25 px-2 py-1 rounded shrink-0">
            Bônus
          </div>
        </div>
      )}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {p.cover_image_url ? <img src={p.cover_image_url} alt={p.title} className={cn("w-full h-full object-cover", !isActive && "grayscale")} loading="lazy" />
          : <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur"><MapPin className="w-2.5 h-2.5 mr-0.5" /> {p.destination}</Badge>
          {p.is_promo && <Badge className="bg-amber-500 text-black hover:bg-amber-500"><Sparkles className="w-2.5 h-2.5 mr-0.5" /> Promo</Badge>}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {!isActive && <Badge variant="outline" className="bg-black/60 text-white border-white/30 backdrop-blur">Inativo</Badge>}
          {p.status && p.status !== "active" && p.status !== "draft" && (
            <Badge variant={statusBadge as any} className="capitalize">{p.status}</Badge>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base leading-tight line-clamp-2 flex-1">{p.title}</h3>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-md bg-primary/8 border border-primary/20 text-[10.5px] font-semibold text-primary uppercase tracking-wide">
            <kindMeta.Icon className="w-3 h-3" />
            <span>{kindMeta.label}</span>
          </div>
          {hasFlight && originLabel && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PlaneTakeoff className="w-3 h-3 text-foreground/60" />
              <span>Saindo de <span className="font-semibold text-foreground">{originLabel}</span></span>
            </div>
          )}
          {p.flexible_dates ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3 text-foreground/60" />
              <span className="font-medium text-foreground">Datas flexíveis</span>
            </div>
          ) : (depDate || retDate) ? (
            <div className="inline-grid grid-cols-[auto_auto] gap-x-2 gap-y-1 text-[11px] self-start">
              {depDate && (
                <>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center">Ida</span>
                  <span className="font-semibold tabular-nums text-foreground px-1.5 py-0.5 rounded-md bg-muted text-center">{depDate}</span>
                </>
              )}
              {retDate && (
                <>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center">Volta</span>
                  <span className="font-semibold tabular-nums text-foreground px-1.5 py-0.5 rounded-md bg-muted text-center">{retDate}</span>
                </>
              )}
            </div>
          ) : null}
        </div>
        {(() => {
          const planPrice = Number(p.price_promo) || Number(p.price_from) || 0;
          const pt = (p as any).payment_terms || {};
          const plan = computeNatlevaPlan(planPrice, p.departure_date, {
            entryPercent: Number(pt.entry_percent) || undefined,
            entryAmount: Number(pt.entry_amount) || undefined,
            daysBefore: Number(pt.min_days_before_checkin) || undefined,
            currency: p.currency || "BRL",
            maxInstallments: Number(pt.balance_installments_max) || undefined,
            minInstallment: Number(pt.balance_min_installment) || undefined,
            customInstallments: Array.isArray(pt.balance_custom_installments) ? pt.balance_custom_installments : undefined,
          });
          return (
            <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/30 gap-2">
              <div className="min-w-0">
                {plan ? (
                  <>
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      <span className="tabular-nums">{formatMoneyBR(plan.entryAmount, plan.currency)}</span>
                      <span className="text-muted-foreground font-normal"> de entrada</span>
                    </div>
                    <div className="text-[12px] text-foreground/80 leading-tight mt-0.5">
                      <span className="font-semibold tabular-nums">+ {plan.installments}x</span>
                      <span className="text-muted-foreground"> de </span>
                      <span className="font-semibold tabular-nums">{formatMoneyBR(plan.installmentAmount, plan.currency)}</span>
                      <span className="text-muted-foreground"> sem juros{(pt.balance_method || "boleto") === "boleto" ? " no boleto" : ""}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      Total {formatMoneyBR(plan.total, plan.currency)}
                      {(() => {
                        const ad = Number((p as any).pax_adults) || 0;
                        const ch = Number((p as any).pax_children) || 0;
                        const pax = Math.max(1, ad + ch);
                        const isPP = ((p as any).price_label || "por pessoa") === "por pessoa";
                        let label: string;
                        if (isPP) {
                          label = "por pessoa";
                        } else {
                          const parts: string[] = [];
                          if (ad > 0) parts.push(`${ad} ${ad === 1 ? "adulto" : "adultos"}`);
                          if (ch > 0) parts.push(`${ch} ${ch === 1 ? "criança" : "crianças"}`);
                          label = `para ${parts.length ? parts.join(" + ") : `${pax} ${pax === 1 ? "pessoa" : "pessoas"}`}`;
                        }
                        return (
                          <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-semibold uppercase tracking-wider text-[9px]">
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="text-sm font-semibold">{promo || full || "Sob consulta"}</div>
                )}
              </div>
              {!isAffiliate && (
                <button
                  onClick={() => setAnalyticsOpen(true)}
                  className="flex items-center gap-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Ver analytics deste produto"
                >
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.view_count || 0}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.lead_count || 0}</span>
                </button>
              )}
            </div>
          );
        })()}
        {!isAffiliate && (
        <div
          className={cn(
            "mt-2 px-3 py-2.5 rounded-lg border-2 flex items-center justify-between gap-2 shadow-sm",
            hasCommission
              ? "border-sky-500/60 bg-gradient-to-r from-sky-500/15 via-indigo-500/10 to-sky-500/15"
              : "border-dashed border-amber-500/50 bg-amber-500/10"
          )}
          title="Uso interno · comissão paga ao vendedor"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
              hasCommission ? "bg-sky-500 text-white" : "bg-amber-500/20 text-amber-700"
            )}>
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className={cn("text-[10px] uppercase tracking-wider font-bold leading-none",
                hasCommission ? "text-sky-700 dark:text-sky-300" : "text-amber-700 dark:text-amber-400"
              )}>
                Bônus Indicação 🔒
              </div>
              {hasCommission ? (
                <div className="text-[15px] font-extrabold tabular-nums leading-tight mt-1 text-sky-900 dark:text-sky-100">
                  {fmtMoney(commission, p.currency)}
                  <span className="text-[10px] font-medium text-muted-foreground ml-1">por venda</span>
                </div>
              ) : (
                <Link to={`/prateleira/${p.slug}/editar`} className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline mt-0.5 inline-block">
                  Defina a comissão
                </Link>
              )}
            </div>
          </div>
        </div>
        )}
        {!isAffiliate && (<>
        {/* Lucro estimado · uso interno */}
        <div
          className={cn(
            "mt-2 px-3 py-2 rounded-md border flex items-center justify-between gap-2",
            hasCost
              ? profit > 0
                ? "border-emerald-500/30 bg-emerald-500/5"
                : profit < 0
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-muted/30"
              : "border-dashed border-amber-500/30 bg-amber-500/5"
          )}
          title="Uso interno · não aparece na proposta"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <TrendingUp className={cn("w-3.5 h-3.5 shrink-0",
              hasCost ? (profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-muted-foreground") : "text-amber-600"
            )} />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-none">Lucro 🔒</div>
              {hasCost ? (
                <div className="text-[12px] font-bold tabular-nums leading-tight mt-0.5">
                  {fmtMoney(profit, p.currency)} <span className="text-[10px] font-normal text-muted-foreground">· {margin.toFixed(0)}%</span>
                </div>
              ) : (
                <Link to={`/prateleira/${p.slug}/editar`} className="text-[11px] text-amber-700 dark:text-amber-400 hover:underline">
                  Cadastre o custo
                </Link>
              )}
            </div>
          </div>
          {hasCost && (
            <div className="text-right">
              <div className="text-[9px] text-muted-foreground leading-none">Receita · custo</div>
              <div className="text-[10px] tabular-nums text-muted-foreground mt-0.5">
                {fmtMoney(revenue, p.currency)} · {fmtMoney(cost, p.currency)}
              </div>
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex items-center justify-between gap-3 mt-3 px-3 py-2 rounded-md border",
            isActive ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/40"
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isActive ? (
              <Power className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <PowerOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="min-w-0">
              <div className="text-[11px] font-semibold leading-none">
                {isActive ? "Ativo na vitrine" : "Desativado"}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {isActive ? "Página pública no ar" : "Oculto e página indisponível"}
              </div>
            </div>
          </div>
          <Switch
            checked={isActive}
            disabled={savingActive}
            onCheckedChange={handleToggleActive}
            aria-label="Ativar ou desativar produto"
          />
        </div>
        </>)}
        <div className="flex flex-col gap-2 mt-3">
          <div className="flex gap-2">
            {!isAffiliate && (
              <Link to={`/prateleira/${p.slug}/editar`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full"><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
              </Link>
            )}
            {!isAffiliate && (
              <Button variant="outline" size="sm" onClick={() => setAnalyticsOpen(true)} title="Analytics">
                <BarChart3 className="w-3.5 h-3.5" />
              </Button>
            )}
            <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer" className={isAffiliate ? "flex-1" : ""}>
              <Button
                variant="outline"
                size="sm"
                title="Abrir página pública"
                className={isAffiliate ? "w-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary text-xs font-medium" : ""}
              >
                <ExternalLink className="w-3.5 h-3.5" />{isAffiliate && <span className="ml-1.5">Abrir página</span>}
              </Button>
            </a>
            {!isAffiliate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                title="Excluir produto"
                className="text-red-600 hover:text-red-700 hover:bg-red-500/10 border-red-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMediaOpen(true)}
            className="w-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary text-xs font-medium"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
            Mídias para Divulgação
          </Button>
        </div>
      </div>
      <PrateleiraAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        product={{ id: p.id, slug: p.slug, title: p.title }}
      />
      <MarketingMediaDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        productId={p.id}
        productTitle={p.title}
      />
    </Card>
  );
}
