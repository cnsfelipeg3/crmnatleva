import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Calendar, Sparkles, Plane, Hotel, Package, Ship, Compass } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import CinematicVitrineHero from "@/components/prateleira/CinematicVitrineHero";

type Product = any;

const KINDS = [
  { slug: "all", label: "Todos", icon: Compass },
  { slug: "pacote", label: "Pacotes", icon: Package },
  { slug: "aereo", label: "Aéreo", icon: Plane },
  { slug: "hospedagem", label: "Hospedagem", icon: Hotel },
  { slug: "passeio", label: "Passeios", icon: MapPin },
  { slug: "cruzeiro", label: "Cruzeiros", icon: Ship },
];

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd/MM", { locale: ptBR }); } catch { return d; }
}
function formatMoney(v?: number | null, currency = "BRL") {
  if (v == null) return null;
  const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${symbol} ${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export default function PrateleiraVitrine() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [destination, setDestination] = useState("all");
  const [q, setQ] = useState("");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sort, setSort] = useState<"relevance" | "price_asc" | "soon" | "new">("relevance");

  useEffect(() => {
    document.title = "Prateleira NatLeva · Viagens prontas para embarcar";
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*")
        .eq("is_active", true)
        .neq("status", "paused")
        .order("display_order", { ascending: true });
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const destinations = useMemo(() => Array.from(new Set(items.map((p) => p.destination))).sort(), [items]);

  const filtered = useMemo(() => {
    let arr = items.filter((p) => {
      if (kind !== "all" && p.product_kind !== kind) return false;
      if (destination !== "all" && p.destination !== destination) return false;
      if (onlyPromo && !p.is_promo) return false;
      if (q && !`${p.title} ${p.short_description ?? ""} ${p.destination}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (sort === "price_asc") arr = arr.slice().sort((a, b) => (a.price_promo ?? a.price_from ?? Infinity) - (b.price_promo ?? b.price_from ?? Infinity));
    else if (sort === "soon") arr = arr.slice().sort((a, b) => (a.departure_date || "9999").localeCompare(b.departure_date || "9999"));
    else if (sort === "new") arr = arr.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return arr;
  }, [items, kind, destination, q, onlyPromo, sort]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border" style={{ background: "linear-gradient(135deg, hsl(150 40% 6%) 0%, hsl(150 40% 12%) 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-medium tracking-widest uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Prateleira NatLeva
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-white leading-tight max-w-3xl">
            Viagens prontas para embarcar, com <span className="text-amber-300">condições especiais</span>.
          </h1>
          <p className="text-white/70 mt-3 max-w-xl text-sm sm:text-base">
            Pacotes, aéreos, hospedagens e experiências curadas pela NatLeva. Datas, preços e parcelamentos transparentes.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar destino, pacote, hotel..."
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-12"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}
              className="bg-white/10 border border-white/20 text-white rounded-md px-3 h-12 text-sm">
              <option value="relevance" className="text-foreground">Mais relevantes</option>
              <option value="price_asc" className="text-foreground">Menor preço</option>
              <option value="soon" className="text-foreground">Saindo em breve</option>
              <option value="new" className="text-foreground">Novidades</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Kind chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {KINDS.map((k) => {
            const Icon = k.icon;
            const active = kind === k.slug;
            return (
              <button key={k.slug} onClick={() => setKind(k.slug)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5",
                  active ? "bg-foreground text-background border-foreground" : "bg-card text-foreground border-border hover:border-foreground/40"
                )}>
                <Icon className="w-4 h-4" /> {k.label}
              </button>
            );
          })}
        </div>

        {/* Filters secondary */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <select value={destination} onChange={(e) => setDestination(e.target.value)}
            className="bg-card border border-border rounded-md px-3 py-1.5 text-sm">
            <option value="all">Todos os destinos</option>
            {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => setOnlyPromo(!onlyPromo)}
            className={cn("px-3 py-1.5 rounded-md text-sm border transition-all flex items-center gap-1.5",
              onlyPromo ? "bg-amber-500 text-black border-amber-500" : "bg-card border-border hover:border-foreground/40")}>
            <Sparkles className="w-3.5 h-3.5" /> Só promoções
          </button>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} produto(s)</span>
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Nenhum produto bate com seus filtros.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setKind("all"); setDestination("all"); setQ(""); setOnlyPromo(false); }}>Limpar filtros</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ p }: { p: Product }) {
  const promo = p.price_promo ? formatMoney(p.price_promo, p.currency) : null;
  const full = p.price_from ? formatMoney(p.price_from, p.currency) : null;
  const dateRange = p.flexible_dates ? "Datas flexíveis"
    : p.departure_date && p.return_date ? `${formatDate(p.departure_date)} → ${formatDate(p.return_date)}`
    : p.departure_date ? `Saída ${formatDate(p.departure_date)}` : null;

  return (
    <Link to={`/p/${p.slug}`} className="group block">
      <Card className="overflow-hidden h-full flex flex-col p-0 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {p.cover_image_url ? (
            <img src={p.cover_image_url} alt={p.title} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />}
          {p.is_promo && p.promo_badge && (
            <Badge className="absolute top-3 right-3 bg-amber-500 text-black hover:bg-amber-500"><Sparkles className="w-3 h-3 mr-1" />{p.promo_badge}</Badge>
          )}
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur px-2.5 py-1 rounded-full text-[11px] text-white">
            <MapPin className="w-3 h-3" /> {p.destination}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-serif text-lg leading-tight text-foreground group-hover:text-amber-600 transition-colors line-clamp-2">{p.title}</h3>
          {p.short_description && <p className="text-[13px] text-muted-foreground mt-1.5 line-clamp-2">{p.short_description}</p>}
          {dateRange && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
              <Calendar className="w-3.5 h-3.5" /> {dateRange}
            </div>
          )}
          <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/30">
            <div>
              {promo && full && <div className="text-[10px] text-muted-foreground line-through">{full}</div>}
              <div className="text-base font-bold text-foreground">{promo || full || "Sob consulta"}</div>
              {p.installments_max && <div className="text-[10px] text-muted-foreground">em até {p.installments_max}x</div>}
            </div>
            {p.product_kind && <Badge variant="outline" className="text-[10px]">{p.product_kind}</Badge>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
