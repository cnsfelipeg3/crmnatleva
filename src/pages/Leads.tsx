// =====================================================================
// /leads · rastreio completo de leads da Prateleira
// Agrega prateleira_product_viewers + prateleira_viewer_events por email,
// mostrando produtos visualizados, tempo por produto, cliques, geo etc.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Search, Eye, Clock, MousePointerClick, MessageCircle,
  Smartphone, MapPin, ExternalLink, PackageOpen, Phone, Mail,
  TrendingUp, Wifi, Activity, Target, Filter as FilterIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatTime, parseUA } from "@/lib/proposalAnalytics";
import { Link } from "react-router-dom";

type ViewerRow = {
  id: string;
  product_id: string;
  product_slug: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device_type: string | null;
  user_agent: string | null;
  total_views: number;
  active_seconds: number;
  whatsapp_clicked: boolean;
  cta_clicked: boolean;
  utm_source: string | null;
  utm_campaign: string | null;
  first_viewed_at: string;
  last_active_at: string;
};

type EventRow = {
  id: string;
  viewer_id: string | null;
  product_id: string;
  email: string;
  event_type: string;
  section: string | null;
  target: string | null;
  created_at: string;
};

type ProductMini = {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  destination: string | null;
};

type LeadProductRow = {
  product: ProductMini | null;
  productId: string;
  views: number;
  activeSeconds: number;
  cta: boolean;
  whatsapp: boolean;
  firstAt: string;
  lastAt: string;
};

type LeadAggregate = {
  key: string; // email
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device: string | null;
  userAgent: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  productsViewed: number;
  totalViews: number;
  totalSeconds: number;
  ctaCount: number;
  whatsappCount: number;
  firstAt: string;
  lastAt: string;
  products: LeadProductRow[];
};

const isOnline = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 60 * 1000;

export default function Leads() {
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<Record<string, ProductMini>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "online" | "whatsapp">("all");
  const [selected, setSelected] = useState<LeadAggregate | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: vData }, { data: eData }] = await Promise.all([
        (supabase as any)
          .from("prateleira_product_viewers")
          .select("*")
          .order("last_active_at", { ascending: false })
          .limit(2000),
        (supabase as any)
          .from("prateleira_viewer_events")
          .select("id, viewer_id, product_id, email, event_type, section, target, created_at")
          .order("created_at", { ascending: false })
          .limit(5000),
      ]);
      const vs = (vData || []) as ViewerRow[];
      setViewers(vs);
      setEvents((eData || []) as EventRow[]);

      // hidratar produtos
      const ids = Array.from(new Set(vs.map((v) => v.product_id)));
      if (ids.length) {
        const { data: pData } = await (supabase as any)
          .from("experience_products")
          .select("id, title, slug, cover_image_url, destination")
          .in("id", ids);
        const map: Record<string, ProductMini> = {};
        (pData || []).forEach((p: ProductMini) => { map[p.id] = p; });
        setProducts(map);
      }
      setLoading(false);
    })();
  }, []);

  const leads = useMemo<LeadAggregate[]>(() => {
    const map = new Map<string, LeadAggregate>();
    for (const v of viewers) {
      const key = (v.email || "").toLowerCase().trim() || `anon:${v.id}`;
      let lead = map.get(key);
      if (!lead) {
        lead = {
          key,
          email: v.email,
          name: v.name,
          phone: v.phone,
          city: v.city,
          region: v.region,
          country: v.country,
          device: v.device_type,
          userAgent: v.user_agent,
          utmSource: v.utm_source,
          utmCampaign: v.utm_campaign,
          productsViewed: 0,
          totalViews: 0,
          totalSeconds: 0,
          ctaCount: 0,
          whatsappCount: 0,
          firstAt: v.first_viewed_at,
          lastAt: v.last_active_at,
          products: [],
        };
        map.set(key, lead);
      } else {
        // prefere campos não-nulos do registro mais recente
        if (!lead.name && v.name) lead.name = v.name;
        if (!lead.phone && v.phone) lead.phone = v.phone;
        if (!lead.city && v.city) lead.city = v.city;
        if (!lead.country && v.country) lead.country = v.country;
        if (!lead.userAgent && v.user_agent) lead.userAgent = v.user_agent;
        if (!lead.device && v.device_type) lead.device = v.device_type;
        if (!lead.utmSource && v.utm_source) lead.utmSource = v.utm_source;
        if (new Date(v.first_viewed_at) < new Date(lead.firstAt)) lead.firstAt = v.first_viewed_at;
        if (new Date(v.last_active_at) > new Date(lead.lastAt)) lead.lastAt = v.last_active_at;
      }
      lead.productsViewed += 1;
      lead.totalViews += v.total_views || 1;
      lead.totalSeconds += v.active_seconds || 0;
      if (v.cta_clicked) lead.ctaCount += 1;
      if (v.whatsapp_clicked) lead.whatsappCount += 1;
      lead.products.push({
        product: products[v.product_id] || null,
        productId: v.product_id,
        views: v.total_views || 1,
        activeSeconds: v.active_seconds || 0,
        cta: v.cta_clicked,
        whatsapp: v.whatsapp_clicked,
        firstAt: v.first_viewed_at,
        lastAt: v.last_active_at,
      });
    }
    return Array.from(map.values())
      .map((l) => ({ ...l, products: l.products.sort((a, b) => b.activeSeconds - a.activeSeconds) }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [viewers, products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "hot" && l.ctaCount === 0 && l.whatsappCount === 0) return false;
      if (filter === "online" && !isOnline(l.lastAt)) return false;
      if (filter === "whatsapp" && l.whatsappCount === 0) return false;
      if (!q) return true;
      return (
        (l.name || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q) ||
        l.products.some((p) => (p.product?.title || "").toLowerCase().includes(q))
      );
    });
  }, [leads, search, filter]);

  // KPIs topo
  const totalLeads = leads.length;
  const onlineNow = leads.filter((l) => isOnline(l.lastAt)).length;
  const hotLeads = leads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0).length;
  const avgProducts = totalLeads > 0
    ? (leads.reduce((s, l) => s + l.productsViewed, 0) / totalLeads).toFixed(1)
    : "0";

  return (
    <div className="container mx-auto px-4 py-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Leads da Prateleira
        </h1>
        <p className="text-sm text-muted-foreground">
          Rastreio completo de quem visitou as páginas de venda · produtos vistos, tempo, cliques, dispositivo e localização.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Kpi icon={Users} label="Total de leads" value={totalLeads.toLocaleString("pt-BR")} />
        <Kpi icon={Wifi} label="Online agora" value={onlineNow.toLocaleString("pt-BR")} tone={onlineNow > 0 ? "live" : undefined} />
        <Kpi icon={TrendingUp} label="Leads quentes" value={hotLeads.toLocaleString("pt-BR")} hint="clicaram CTA ou WhatsApp" tone={hotLeads > 0 ? "hot" : undefined} />
        <Kpi icon={PackageOpen} label="Produtos por lead" value={avgProducts} hint="média" />
      </div>

      {/* Filtros */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone, cidade ou produto..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterChip>
          <FilterChip active={filter === "hot"} onClick={() => setFilter("hot")}>Quentes</FilterChip>
          <FilterChip active={filter === "online"} onClick={() => setFilter("online")}>Online</FilterChip>
          <FilterChip active={filter === "whatsapp"} onClick={() => setFilter("whatsapp")}>Abriu WhatsApp</FilterChip>
        </div>
      </Card>

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/40">
              <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left p-3 font-medium">Lead</th>
                <th className="text-left p-3 font-medium">Contato</th>
                <th className="text-left p-3 font-medium">Produtos vistos</th>
                <th className="text-left p-3 font-medium">Tempo total</th>
                <th className="text-left p-3 font-medium">Ações</th>
                <th className="text-left p-3 font-medium">Origem</th>
                <th className="text-left p-3 font-medium">Última visita</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground animate-pulse">Carregando leads...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {leads.length === 0 ? "Nenhum lead ainda. Compartilhe as páginas de venda da Prateleira para começar." : "Nenhum lead bate com os filtros."}
                </td></tr>
              ) : filtered.map((l) => {
                const online = isOnline(l.lastAt);
                const ua = parseUA(l.userAgent);
                return (
                  <tr
                    key={l.key}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelected(l)}
                  >
                    <td className="p-3 align-top">
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
                        )} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{l.name || "Sem nome"}</p>
                          <p className="text-[10.5px] text-muted-foreground truncate">
                            {l.city ? `${l.city}${l.country ? `, ${l.country}` : ""}` : ua.os}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <p className="text-[11px] text-foreground truncate max-w-[200px]" title={l.email}>{l.email}</p>
                      {l.phone && <p className="text-[10.5px] text-muted-foreground">{l.phone}</p>}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <PackageOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground tabular-nums">{l.productsViewed}</span>
                        <span className="text-[10px] text-muted-foreground">· {l.totalViews} views</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5" title={l.products[0]?.product?.title || ""}>
                        {l.products[0]?.product?.title || ""}
                      </p>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground tabular-nums">{formatTime(l.totalSeconds)}</span>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {l.ctaCount > 0 && (
                          <Badge className="text-[9px] border-0 bg-accent/15 text-accent">
                            <MousePointerClick className="w-2.5 h-2.5 mr-0.5" /> {l.ctaCount} CTA
                          </Badge>
                        )}
                        {l.whatsappCount > 0 && (
                          <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600">
                            <MessageCircle className="w-2.5 h-2.5 mr-0.5" /> {l.whatsappCount}
                          </Badge>
                        )}
                        {l.ctaCount === 0 && l.whatsappCount === 0 && (
                          <span className="text-[10px] text-muted-foreground/60">sem ações</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <p className="text-[10.5px] text-foreground truncate max-w-[120px]">
                        {l.utmSource || "direto"}
                      </p>
                      {l.utmCampaign && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{l.utmCampaign}</p>
                      )}
                    </td>
                    <td className="p-3 align-top text-[10.5px] text-muted-foreground">
                      {formatDistanceToNow(new Date(l.lastAt), { locale: ptBR, addSuffix: true })}
                    </td>
                    <td className="p-3 align-top">
                      <Button variant="ghost" size="sm" className="h-7 text-[10.5px]">
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer/Dialog de detalhes */}
      <LeadDetail
        lead={selected}
        events={events}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone }: {
  icon: any; label: string; value: string; hint?: string; tone?: "hot" | "live";
}) {
  return (
    <Card className={cn(
      "p-3 flex items-start gap-2.5 rounded-2xl border-border/40",
      tone === "hot" && "border-accent/40 bg-accent/5",
      tone === "live" && "border-emerald-500/40 bg-emerald-500/5",
    )}>
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
        tone === "hot" ? "bg-accent/15 text-accent" :
        tone === "live" ? "bg-emerald-500/15 text-emerald-600" :
        "bg-muted text-muted-foreground",
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground leading-tight truncate">{value}</p>
        <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
        {hint && <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{hint}</p>}
      </div>
    </Card>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-lg text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function LeadDetail({ lead, events, onClose }: {
  lead: LeadAggregate | null;
  events: EventRow[];
  onClose: () => void;
}) {
  if (!lead) return null;

  const leadEvents = events.filter((e) => (e.email || "").toLowerCase() === lead.email.toLowerCase());
  const clicks = leadEvents.filter((e) => e.event_type === "click");
  const sectionViews = leadEvents.filter((e) => e.event_type === "section_view");
  const ua = parseUA(lead.userAgent);

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {lead.name || lead.email}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {/* Contato e contexto */}
            <Card className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                <Info icon={Mail} label="Email" value={lead.email} />
                <Info icon={Phone} label="Telefone" value={lead.phone || "·"} />
                <Info icon={MapPin} label="Localização" value={lead.city ? `${lead.city}${lead.country ? `, ${lead.country}` : ""}` : "·"} />
                <Info icon={Smartphone} label="Dispositivo" value={`${ua.os} · ${ua.browser}${lead.device ? ` (${lead.device})` : ""}`} />
                <Info icon={Activity} label="Primeira visita" value={format(new Date(lead.firstAt), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
                <Info icon={Activity} label="Última visita" value={formatDistanceToNow(new Date(lead.lastAt), { locale: ptBR, addSuffix: true })} />
                {lead.utmSource && <Info icon={Target} label="Origem" value={`${lead.utmSource}${lead.utmCampaign ? ` · ${lead.utmCampaign}` : ""}`} />}
              </div>
            </Card>

            {/* Resumo de ações */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <MiniKpi label="Produtos vistos" value={lead.productsViewed} />
              <MiniKpi label="Visualizações" value={lead.totalViews} />
              <MiniKpi label="Tempo ativo" value={formatTime(lead.totalSeconds)} />
              <MiniKpi label="Cliques no CTA" value={lead.ctaCount} tone={lead.ctaCount > 0 ? "hot" : undefined} />
            </div>

            {/* Produtos visualizados */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PackageOpen className="w-3.5 h-3.5" /> Produtos visualizados
              </div>
              <div className="space-y-2">
                {lead.products.map((p) => (
                  <div key={p.productId} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30">
                    {p.product?.cover_image_url ? (
                      <img src={p.product.cover_image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <PackageOpen className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {p.product?.title || "Produto removido"}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground truncate">
                        {p.product?.destination || "·"} · {p.views} {p.views === 1 ? "visualização" : "visualizações"} · {formatTime(p.activeSeconds)} ativo
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        Última vez {formatDistanceToNow(new Date(p.lastAt), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {(p.cta || p.whatsapp) && (
                        <div className="flex gap-1">
                          {p.cta && <Badge className="text-[9px] border-0 bg-accent/15 text-accent">CTA</Badge>}
                          {p.whatsapp && <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600">WhatsApp</Badge>}
                        </div>
                      )}
                      {p.product?.slug && (
                        <Link
                          to={`/produtos/${p.product.slug}/editar`}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          abrir produto <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top seções */}
            {sectionViews.length > 0 && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <FilterIcon className="w-3.5 h-3.5" /> Seções visitadas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(sectionViews.map((s) => s.section).filter(Boolean))).map((s) => (
                    <Badge key={s} variant="neutral" className="text-[10px] capitalize">
                      {(s || "").replace(/[-_]/g, " ")}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Timeline de cliques */}
            {clicks.length > 0 && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Target className="w-3.5 h-3.5" /> Últimos cliques ({clicks.length})
                </div>
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                  {clicks.slice(0, 50).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[10.5px] py-1 px-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MousePointerClick className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground truncate">{c.target || "·"}</span>
                        {c.section && <span className="text-muted-foreground">· {c.section}</span>}
                      </div>
                      <span className="text-muted-foreground tabular-nums flex-shrink-0">
                        {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string | number; tone?: "hot" }) {
  return (
    <Card className={cn(
      "p-2.5 rounded-xl text-center border-border/40",
      tone === "hot" && "border-accent/40 bg-accent/5",
    )}>
      <p className={cn("text-base font-bold leading-tight", tone === "hot" ? "text-accent" : "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </Card>
  );
}
