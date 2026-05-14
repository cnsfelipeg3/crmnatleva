import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Plane, Hotel, Package, Ship, Compass, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CinematicVitrineHero from "@/components/prateleira/CinematicVitrineHero";
import NetflixRow, { type RowItem } from "@/components/prateleira/NetflixRow";
import { RowSkeleton } from "@/components/prateleira/RowSkeleton";
import { resolveAgencyWhatsApp } from "@/lib/natleva/whatsapp";

type Product = any;

const KINDS = [
  { slug: "all", label: "Todos", icon: Compass },
  { slug: "pacote", label: "Pacotes", icon: Package },
  { slug: "aereo", label: "Aéreo", icon: Plane },
  { slug: "hospedagem", label: "Hospedagem", icon: Hotel },
  { slug: "passeio", label: "Passeios", icon: MapPin },
  { slug: "cruzeiro", label: "Cruzeiros", icon: Ship },
];

function toRowItem(p: Product): RowItem {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    cover: p.cover_image_url,
    destination: p.destination,
    shortDescription: p.short_description,
    description: p.description,
    kindLabel: p.product_kind,
    isPromo: p.is_promo,
    promoBadge: p.promo_badge,
    pricePromo: p.price_promo,
    priceFrom: p.price_from,
    currency: p.currency,
    departureDate: p.departure_date,
    returnDate: p.return_date,
    flexibleDates: p.flexible_dates,
    gallery: Array.isArray(p.gallery) ? p.gallery : null,
    nights: p.nights,
    hotelName: p.hotel_name,
  };
}

export default function PrateleiraVitrine() {
  const [kind, setKind] = useState("all");
  const [destination, setDestination] = useState("all");
  const [q, setQ] = useState("");
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [sort, setSort] = useState<"relevance" | "price_asc" | "soon" | "new">("relevance");

  useEffect(() => {
    document.title = "Prateleira NatLeva · Viagens prontas para embarcar";
  }, []);

  // Cache global · ao voltar de /p/:slug a vitrine reaparece instantaneamente sem refetch
  const { data, isLoading } = useQuery({
    queryKey: ["prateleira-vitrine"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const [{ data: products }, cfgRes] = await Promise.all([
        (supabase as any)
          .from("experience_products").select("*")
          .eq("is_active", true)
          .neq("status", "paused")
          .order("display_order", { ascending: true }),
        (supabase as any).from("agency_config").select("whatsapp_number").maybeSingle().then((r: any) => r).catch(() => ({ data: null })),
      ]);
      return { products: (products || []) as Product[], whatsapp: resolveAgencyWhatsApp(cfgRes?.data?.whatsapp_number) };
    },
  });

  const items: Product[] = data?.products ?? [];
  const whatsapp: string | null = data?.whatsapp ?? null;
  const loading = isLoading;

  const destinations = useMemo(
    () => Array.from(new Set(items.map((p) => p.destination).filter(Boolean))).sort(),
    [items]
  );

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

  const filtersActive = kind !== "all" || destination !== "all" || onlyPromo || q.trim() !== "";

  // Rows
  const promos = useMemo(() => items.filter((p) => p.is_promo).map(toRowItem), [items]);
  const trending = useMemo(
    () => items.slice().sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)).slice(0, 12).map(toRowItem),
    [items]
  );
  const soon = useMemo(
    () => items
      .filter((p) => p.departure_date)
      .slice()
      .sort((a, b) => (a.departure_date || "").localeCompare(b.departure_date || ""))
      .slice(0, 12)
      .map(toRowItem),
    [items]
  );
  const fresh = useMemo(
    () => items.slice().sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 12).map(toRowItem),
    [items]
  );
  const byDestination = useMemo(() => {
    const map = new Map<string, Product[]>();
    items.forEach((p) => {
      if (!p.destination) return;
      if (!map.has(p.destination)) map.set(p.destination, []);
      map.get(p.destination)!.push(p);
    });
    // Só vira fileira própria quando há >= 3 itens · evita carrossel "torto" com 1 card
    return Array.from(map.entries())
      .filter(([, arr]) => arr.length >= 3)
      .sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  // Destinos com poucos itens (1 ou 2) viram uma fileira agregada "Mais destinos"
  const moreDestinations = useMemo(() => {
    const grouped = new Map<string, Product[]>();
    items.forEach((p) => {
      if (!p.destination) return;
      if (!grouped.has(p.destination)) grouped.set(p.destination, []);
      grouped.get(p.destination)!.push(p);
    });
    const small = Array.from(grouped.entries()).filter(([, arr]) => arr.length < 3);
    return small.flatMap(([, arr]) => arr).map(toRowItem);
  }, [items]);

  const clearFilters = () => { setKind("all"); setDestination("all"); setQ(""); setOnlyPromo(false); };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero cinematográfico */}
      <CinematicVitrineHero
        slides={items.slice(0, 6).map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          cover: p.cover_image_url,
          destination: p.destination,
          destinationCountry: p.destination_country,
          shortDescription: p.short_description,
          kindLabel: p.product_kind,
          promoBadge: p.promo_badge,
          isPromo: p.is_promo,
        }))}
        q={q}
        setQ={setQ}
        sort={sort}
        setSort={setSort}
      />

      {/* Sticky filters bar (Netflix style) */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0a]/85 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-3">
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {KINDS.map((k) => {
              const Icon = k.icon;
              const active = kind === k.slug;
              return (
                <button
                  key={k.slug}
                  onClick={() => setKind(k.slug)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] font-medium border transition-all flex items-center gap-1.5",
                    active
                      ? "bg-white text-black border-white shadow-[0_0_24px_-4px_rgba(255,255,255,0.4)]"
                      : "bg-white/5 text-white/85 border-white/10 hover:bg-white/10 hover:border-white/25"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {k.label}
                </button>
              );
            })}

            <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="shrink-0 bg-white/5 border border-white/10 hover:border-white/25 rounded-full px-3.5 py-1.5 text-[12.5px] text-white/90 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="all" className="bg-neutral-900">Todos os destinos</option>
              {destinations.map((d) => <option key={d} value={d} className="bg-neutral-900">{d}</option>)}
            </select>

            <button
              onClick={() => setOnlyPromo(!onlyPromo)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-[12.5px] border transition-all flex items-center gap-1.5",
                onlyPromo
                  ? "bg-amber-400 text-black border-amber-400"
                  : "bg-white/5 border-white/10 text-white/85 hover:border-white/25"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" /> Promoções
            </button>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar destino, hotel..."
                  className="bg-white/5 border border-white/10 rounded-full pl-8 pr-3 py-1.5 text-[12.5px] text-white placeholder:text-white/40 w-56 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent"
                />
              </div>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {loading ? (
          <div aria-busy="true" aria-live="polite">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : filtersActive ? (
          filtered.length === 0 ? (
            <div className="max-w-2xl mx-auto px-6 py-24 text-center">
              <div className="inline-flex w-16 h-16 rounded-full bg-white/5 items-center justify-center mb-4">
                <Search className="w-7 h-7 text-white/40" />
              </div>
              <h3 className="font-serif t-h3 t-balance text-white mb-2">Nada por aqui ainda</h3>
              <p className="t-body-sm t-pretty text-white/60 mb-6">A gente não encontrou nenhuma viagem com esses filtros.</p>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <NetflixRow
              title="Resultados da busca"
              subtitle={`${filtered.length} viagem(ns) prontas para embarcar`}
              items={filtered.map(toRowItem)}
              whatsapp={whatsapp}
            />
          )
        ) : (
          <>
            {promos.length > 0 && (
              <NetflixRow
                title="Promoções imperdíveis"
                subtitle="Ofertas com desconto real, por tempo limitado"
                items={promos}
                whatsapp={whatsapp}
              />
            )}
            <NetflixRow
              title="Em alta na NatLeva"
              subtitle="As viagens mais procuradas da semana"
              items={trending}
              whatsapp={whatsapp}
            />
            {soon.length > 0 && (
              <NetflixRow
                title="Saídas mais próximas"
                subtitle="Embarque já com tudo organizado"
                items={soon}
                whatsapp={whatsapp}
              />
            )}
            {byDestination.map(([dest, arr]) => (
              <NetflixRow
                key={dest}
                title={dest}
                subtitle={`${arr.length} experiência(s) selecionadas`}
                items={arr.map(toRowItem)}
                whatsapp={whatsapp}
              />
            ))}
            {moreDestinations.length > 0 && (
              <NetflixRow
                title="Mais destinos"
                subtitle={`${moreDestinations.length} experiência(s) em outros destinos`}
                items={moreDestinations}
                whatsapp={whatsapp}
              />
            )}
            <NetflixRow
              title="Acabou de chegar"
              subtitle="Novidades fresquinhas no nosso catálogo"
              items={fresh}
              whatsapp={whatsapp}
            />
          </>
        )}

        <div className="h-16" />
      </div>
    </div>
  );
}
