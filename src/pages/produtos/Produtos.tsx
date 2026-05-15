import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Sparkles, MapPin, Plus, Search, ExternalLink, Eye, Users, Pencil, Calendar, BarChart3, Power, PowerOff, Trash2, TrendingUp } from "lucide-react";
import PrateleiraAnalyticsDialog from "@/components/prateleira/PrateleiraAnalyticsDialog";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [destination, setDestination] = useState("all");
  const [q, setQ] = useState("");
  const [onlyPromo, setOnlyPromo] = useState(false);

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

  const filtered = useMemo(() => items.filter((p) => {
    if (kind !== "all" && (p.product_kind || "passeio") !== kind) return false;
    if (status !== "all" && (p.status || "active") !== status) return false;
    if (destination !== "all" && p.destination !== destination) return false;
    if (onlyPromo && !p.is_promo) return false;
    if (q && !`${p.title} ${p.short_description ?? ""} ${p.destination}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [items, kind, status, destination, q, onlyPromo]);

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
          <div className="flex items-center gap-2 text-amber-300 text-xs font-medium tracking-widest uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Prateleira NatLeva
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white leading-tight">Marketplace de viagens prontas</h1>
              <p className="text-white/70 text-sm mt-2">Cadastre pacotes, aéreos, hospedagens e experiências com preços e condições especiais.</p>
            </div>
            <div className="flex gap-2">
              <a href="/p" target="_blank" rel="noreferrer">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20"><ExternalLink className="w-4 h-4 mr-1.5" /> Ver vitrine pública</Button>
              </a>
              <Link to="/prateleira/novo">
                <Button className="bg-amber-500 text-black hover:bg-amber-400"><Plus className="w-4 h-4 mr-1.5" /> Novo produto</Button>
              </Link>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6">
            <KPI label="Total" value={totals.total} />
            <KPI label="Ativos" value={totals.active} />
            <KPI label="Em promo" value={totals.promo} />
            <KPI label="Visualizações" value={totals.views} />
            <KPI label="Leads" value={totals.leads} />
            <KPI label="Lucro 🔒" value={fmtMoney(totals.profit)} highlight />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar título, destino..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
              {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} className="bg-background border border-border rounded-md px-3 py-2 text-sm">
              <option value="all">Todos destinos</option>
              {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => setOnlyPromo(!onlyPromo)}
              className={cn("px-3 py-2 rounded-md text-sm border flex items-center gap-1.5",
                onlyPromo ? "bg-amber-500 text-black border-amber-500" : "bg-background border-border")}>
              <Sparkles className="w-3.5 h-3.5" /> Promos
            </button>
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
                onToggleActive={(next) =>
                  setItems((prev) => prev.map((it) => (it.id === p.id ? { ...it, is_active: next } : it)))
                }
                onDelete={() => setItems((prev) => prev.filter((it) => it.id !== p.id))}
              />
            ))}
          </div>
        )}
      </div>
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

function AdminProductCard({ p, onToggleActive }: { p: Product; onToggleActive: (next: boolean) => void }) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [savingActive, setSavingActive] = useState(false);
  const isActive = p.is_active !== false;
  const promo = p.price_promo ? fmtMoney(p.price_promo, p.currency) : null;
  const full = p.price_from ? fmtMoney(p.price_from, p.currency) : null;
  const dateRange = p.flexible_dates ? "Flexíveis"
    : p.departure_date && p.return_date ? `${fmtDate(p.departure_date)}-${fmtDate(p.return_date)}`
    : p.departure_date ? `${fmtDate(p.departure_date)}` : null;
  const statusBadge = p.status === "draft" ? "secondary" : p.status === "paused" ? "outline" : "default";

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

  return (
    <Card className={cn("overflow-hidden flex flex-col p-0 transition-opacity", !isActive && "opacity-70")}>
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {p.cover_image_url ? <img src={p.cover_image_url} alt={p.title} className={cn("w-full h-full object-cover", !isActive && "grayscale")} loading="lazy" />
          : <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur"><MapPin className="w-2.5 h-2.5 mr-0.5" /> {p.destination}</Badge>
          {p.is_promo && <Badge className="bg-amber-500 text-black hover:bg-amber-500"><Sparkles className="w-2.5 h-2.5 mr-0.5" /> Promo</Badge>}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {!isActive && <Badge variant="outline" className="bg-black/60 text-white border-white/30 backdrop-blur">Inativo</Badge>}
          <Badge variant={statusBadge as any} className="capitalize">{p.status || "active"}</Badge>
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base leading-tight line-clamp-2 flex-1">{p.title}</h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-2">
          <Badge variant="outline" className="text-[10px]">{p.product_kind || "passeio"}</Badge>
          {dateRange && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dateRange}</span>}
        </div>
        <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/30">
          <div>
            {promo && full && <div className="text-[10px] text-muted-foreground line-through">{full}</div>}
            <div className="text-sm font-semibold">{promo || full || "Sob consulta"}</div>
          </div>
          <button
            onClick={() => setAnalyticsOpen(true)}
            className="flex items-center gap-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            title="Ver analytics deste produto"
          >
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {p.view_count || 0}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {p.lead_count || 0}</span>
          </button>
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
        <div className="flex gap-2 mt-3">
          <Link to={`/prateleira/${p.slug}/editar`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full"><Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setAnalyticsOpen(true)} title="Analytics">
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
          <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" title="Abrir página"><ExternalLink className="w-3.5 h-3.5" /></Button>
          </a>
        </div>
      </div>
      <PrateleiraAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        product={{ id: p.id, slug: p.slug, title: p.title }}
      />
    </Card>
  );
}
