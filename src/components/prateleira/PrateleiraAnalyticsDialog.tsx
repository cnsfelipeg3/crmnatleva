import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Users, MapPin, Smartphone, Loader2, Search, Mail, Phone, Globe, MessageCircle, Download, Clock, MousePointerClick, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: { id: string; slug?: string; title: string };
}

type Viewer = any;
type Lead = any;
type ViewerEvent = any;

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try { return format(parseISO(d), "dd/MM HH:mm", { locale: ptBR }); } catch { return d; }
}

function fmtDuration(seconds?: number | null) {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const SECTION_LABEL: Record<string, string> = {
  hero: "Capa",
  highlights: "Por que vale a pena",
  description: "Sobre a viagem",
  gallery: "Galeria",
  logistica: "Logística",
  includes: "Está incluso",
  how_it_works: "Como funciona",
  recommendations: "Recomendações",
  sales_triggers: "Prova social",
  offer: "Bloco de oferta",
};

const TARGET_LABEL: Record<string, string> = {
  cta_whatsapp: "Clicou no CTA WhatsApp",
  share_button: "Compartilhou o link",
  gallery_open_all: "Abriu galeria completa",
};

export default function PrateleiraAnalyticsDialog({ open, onOpenChange, product }: Props) {
  const [loading, setLoading] = useState(true);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"viewers" | "leads">("viewers");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || !product?.id) return;
    setLoading(true);
    (async () => {
      const [{ data: v }, { data: l }] = await Promise.all([
        (supabase as any).from("prateleira_product_viewers")
          .select("*").eq("product_id", product.id).order("last_active_at", { ascending: false }).limit(500),
        (supabase as any).from("prateleira_leads")
          .select("*").eq("product_id", product.id).order("created_at", { ascending: false }).limit(500),
      ]);
      setViewers(v || []);
      setLeads(l || []);
      setLoading(false);
    })();
  }, [open, product?.id]);

  const stats = useMemo(() => {
    const totalViews = viewers.reduce((s, v) => s + (v.total_views || 1), 0);
    const uniqueVisitors = viewers.length;
    const totalLeads = leads.length;
    const conversion = uniqueVisitors > 0 ? (totalLeads / uniqueVisitors) * 100 : 0;
    const mobile = viewers.filter((v) => v.device_type === "mobile").length;
    const cities = Array.from(new Set(viewers.map((v) => v.city).filter(Boolean))).slice(0, 8);
    return { totalViews, uniqueVisitors, totalLeads, conversion, mobile, cities };
  }, [viewers, leads]);

  const filteredViewers = useMemo(() => {
    if (!q.trim()) return viewers;
    const k = q.toLowerCase();
    return viewers.filter((v) =>
      [v.name, v.email, v.phone, v.city, v.country].filter(Boolean).join(" ").toLowerCase().includes(k)
    );
  }, [viewers, q]);

  const filteredLeads = useMemo(() => {
    if (!q.trim()) return leads;
    const k = q.toLowerCase();
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.message].filter(Boolean).join(" ").toLowerCase().includes(k)
    );
  }, [leads, q]);

  const exportCSV = () => {
    const rows = tab === "viewers" ? filteredViewers : filteredLeads;
    if (rows.length === 0) return;
    const headers = tab === "viewers"
      ? ["nome", "email", "whatsapp", "device", "cidade", "regiao", "pais", "visitas", "primeira_visita", "ultima_visita", "utm_source"]
      : ["nome", "email", "whatsapp", "mensagem", "device", "criado_em", "utm_source", "utm_campaign"];
    const lines = rows.map((r: any) => tab === "viewers"
      ? [r.name, r.email, r.phone, r.device_type, r.city, r.region, r.country, r.total_views, r.first_viewed_at, r.last_active_at, r.utm_source]
      : [r.name, r.email, r.phone, r.message, r.device, r.created_at, r.utm_source, r.utm_campaign]
    );
    const csv = [headers, ...lines].map((row) =>
      row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${product.slug || "produto"}-${tab}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Analytics · {product.title}</DialogTitle>
          <DialogDescription>
            Quem acessou esse produto, de onde, e quem deixou contato pra fechar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados...
          </div>
        ) : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Kpi icon={<Eye className="w-4 h-4" />} label="Acessos totais" value={stats.totalViews} />
              <Kpi icon={<Users className="w-4 h-4" />} label="Visitantes únicos" value={stats.uniqueVisitors} />
              <Kpi icon={<MessageCircle className="w-4 h-4" />} label="Leads (CTA)" value={stats.totalLeads} />
              <Kpi icon={<Smartphone className="w-4 h-4" />} label="Conversão" value={`${stats.conversion.toFixed(1)}%`} />
            </div>

            {/* Cidades */}
            {stats.cities.length > 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Globe className="w-3 h-3" /> Principais cidades
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.cities.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
              <button
                onClick={() => setTab("viewers")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "viewers" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
              >
                Visitantes ({viewers.length})
              </button>
              <button
                onClick={() => setTab("leads")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === "leads" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}
              >
                Leads CTA ({leads.length})
              </button>
              <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, e-mail..." className="pl-8 h-8 text-sm" />
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                </Button>
              </div>
            </div>

            {/* Lista */}
            {tab === "viewers" ? (
              <div className="space-y-2">
                {filteredViewers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum visitante registrado ainda.</p>
                ) : filteredViewers.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border/60 bg-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{v.name || "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {v.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {v.email}</span>}
                        {v.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {v.phone}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}
                    </div>
                    <Badge variant="outline" className="text-[10px]">{v.device_type || "desktop"}</Badge>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {v.total_views || 1} visita{(v.total_views || 1) > 1 ? "s" : ""} · {fmtDate(v.last_active_at)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Ninguém clicou no CTA "Quero saber mais" ainda.</p>
                ) : filteredLeads.map((l) => (
                  <div key={l.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="font-medium">{l.name}</div>
                      {l.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {l.email}</span>}
                      {l.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {l.phone}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
                    </div>
                    {l.message && <p className="text-xs text-foreground/70 mt-1.5 italic">"{l.message}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-2xl font-bold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
