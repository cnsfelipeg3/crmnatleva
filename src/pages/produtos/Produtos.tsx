import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, MapPin, Plus, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destination_country: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  duration: string | null;
  price_from: number | null;
  currency: string | null;
  is_active: boolean;
  display_order: number;
};

export default function Produtos() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products")
        .select("*")
        .eq("is_active", true)
        .order("destination", { ascending: true })
        .order("display_order", { ascending: true });
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  const destinations = useMemo(() => {
    const s = new Set<string>();
    items.forEach((p) => s.add(p.destination));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (destination !== "all" && p.destination !== destination) return false;
      if (q && !`${p.title} ${p.short_description ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, destination, q]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/20"
        style={{ background: "linear-gradient(135deg, hsl(150 40% 6%) 0%, hsl(150 40% 12%) 100%)" }}>
        <div className="max-w-7xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-2 text-champagne text-xs font-medium tracking-widest uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Universo NatLeva
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-white max-w-2xl leading-tight">
            Passeios e experiências assinadas pela <span className="text-champagne">NatLeva</span>
          </h1>
          <p className="text-white/70 mt-4 max-w-xl text-[15px] leading-relaxed">
            A gente seleciona, testa e indica só o que vale a pena. Escolha o destino
            e descubra a prateleira de passeios cuidadosamente curados.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <Input
                placeholder="Buscar passeio…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 bg-white/10 border-white/15 text-white placeholder:text-white/50"
              />
            </div>
            <Link to="/produtos/novo">
              <Button className="bg-champagne text-champagne-foreground hover:bg-champagne/90">
                <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Destinos */}
        <div className="flex flex-wrap gap-2 mb-8">
          <DestinationChip active={destination === "all"} onClick={() => setDestination("all")} label="Todos" />
          {destinations.map((d) => (
            <DestinationChip key={d} active={destination === d} onClick={() => setDestination(d)} label={d} />
          ))}
        </div>

        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando…</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-sm">Nenhum passeio cadastrado para este destino ainda.</p>
            <Link to="/produtos/novo" className="inline-block mt-4">
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Cadastrar primeiro produto</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DestinationChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-foreground border-border/40 hover:border-foreground/40"
      )}
    >
      {label}
    </button>
  );
}

function ProductCard({ p }: { p: Product }) {
  const price = p.price_from
    ? `${p.currency === "USD" ? "US$" : p.currency === "BRL" ? "R$" : (p.currency ?? "")} ${Number(p.price_from).toLocaleString("pt-BR")}`
    : null;
  return (
    <Link to={`/produtos/${p.slug}`} className="group block">
      <Card className="overflow-hidden h-full flex flex-col p-0 hover:-translate-y-1 transition-transform duration-300">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {p.cover_image_url ? (
            <img
              src={p.cover_image_url}
              alt={p.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
          )}
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] text-white">
            <MapPin className="w-3 h-3" /> {p.destination}
          </div>
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-serif text-lg leading-tight text-foreground group-hover:text-champagne transition-colors">
            {p.title}
          </h3>
          {p.short_description && (
            <p className="text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{p.short_description}</p>
          )}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/20">
            {p.duration ? (
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> {p.duration}
              </div>
            ) : <span />}
            {price && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">A partir de</div>
                <div className="text-sm font-semibold text-champagne">{price}</div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
