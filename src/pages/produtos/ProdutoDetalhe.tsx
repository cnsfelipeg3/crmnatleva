import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, MapPin, Check, X, Sparkles, Info, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destination_country: string | null;
  category: string | null;
  short_description: string | null;
  description: string | null;
  cover_image_url: string | null;
  gallery: Array<{ url: string; type?: string; caption?: string }>;
  duration: string | null;
  price_from: number | null;
  currency: string | null;
  includes: string[];
  excludes: string[];
  highlights: string[];
  how_it_works: string | null;
  pickup_info: string | null;
  recommendations: string | null;
};

export default function ProdutoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setP(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Carregando…</div>;
  if (!p) return (
    <div className="p-8">
      <p className="text-muted-foreground">Produto não encontrado.</p>
      <Link to="/produtos"><Button variant="ghost" size="sm" className="mt-4"><ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar</Button></Link>
    </div>
  );

  const gallery = p.gallery?.length ? p.gallery : (p.cover_image_url ? [{ url: p.cover_image_url, type: "image" }] : []);
  const mainImg = gallery[activeImg]?.url ?? p.cover_image_url;
  const price = p.price_from
    ? `${p.currency === "USD" ? "US$" : p.currency === "BRL" ? "R$" : (p.currency ?? "")} ${Number(p.price_from).toLocaleString("pt-BR")}`
    : null;

  return (
    <div className="min-h-screen pb-12">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border/20">
        <Link to="/produtos">
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" /> Todos os passeios</Button>
        </Link>
        <Button variant="outline" size="sm" onClick={() => navigate(`/produtos/${p.slug}/editar`)}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
        </Button>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          {p.destination}{p.destination_country ? ` · ${p.destination_country}` : ""}
        </div>
        <h1 className="font-serif text-3xl md:text-5xl mt-3 leading-tight max-w-3xl">{p.title}</h1>
        {p.short_description && (
          <p className="text-muted-foreground mt-4 max-w-2xl text-[15px] leading-relaxed">{p.short_description}</p>
        )}

        {/* Galeria */}
        {mainImg && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_120px] gap-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <img src={mainImg} alt={p.title} className="w-full h-full object-cover" />
            </div>
            {gallery.length > 1 && (
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[60vh]">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={cn(
                      "relative shrink-0 w-24 h-20 lg:w-full lg:h-24 rounded-lg overflow-hidden border-2 transition-all",
                      i === activeImg ? "border-champagne" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={g.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-10">
          <div className="space-y-8">
            {p.description && (
              <section>
                <h2 className="font-serif text-2xl mb-3">Sobre a experiência</h2>
                <p className="text-[15px] text-foreground/80 leading-relaxed whitespace-pre-line">{p.description}</p>
              </section>
            )}

            {p.highlights?.length > 0 && (
              <section>
                <h2 className="font-serif text-2xl mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-champagne" /> Destaques</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {p.highlights.map((h, i) => (
                    <Card key={i} className="p-4 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-champagne mt-2 shrink-0" />
                      <span className="text-[14px]">{h}</span>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {(p.includes?.length > 0 || p.excludes?.length > 0) && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {p.includes?.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-[14px] mb-3 text-emerald-600">Está incluso</h3>
                    <ul className="space-y-2">
                      {p.includes.map((i, k) => (
                        <li key={k} className="flex items-start gap-2 text-[13.5px]">
                          <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{i}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {p.excludes?.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-semibold text-[14px] mb-3 text-muted-foreground">Não está incluso</h3>
                    <ul className="space-y-2">
                      {p.excludes.map((i, k) => (
                        <li key={k} className="flex items-start gap-2 text-[13.5px]">
                          <X className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{i}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </section>
            )}

            {p.how_it_works && (
              <section>
                <h2 className="font-serif text-2xl mb-3">Como funciona</h2>
                <Card className="p-5 text-[14.5px] leading-relaxed whitespace-pre-line text-foreground/85">
                  {p.how_it_works}
                </Card>
              </section>
            )}

            {p.recommendations && (
              <section>
                <h2 className="font-serif text-2xl mb-3 flex items-center gap-2"><Info className="w-5 h-5" /> Recomendações</h2>
                <Card className="p-5 text-[14px] leading-relaxed whitespace-pre-line text-foreground/80">
                  {p.recommendations}
                </Card>
              </section>
            )}
          </div>

          {/* Sidebar resumo */}
          <aside className="lg:sticky lg:top-6 self-start">
            <Card className="p-6 space-y-4">
              {price && (
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">A partir de</div>
                  <div className="text-3xl font-serif text-champagne mt-1">{price}</div>
                  <div className="text-[11px] text-muted-foreground">por pessoa</div>
                </div>
              )}
              {p.duration && (
                <div className="flex items-center gap-2 text-[13.5px] pt-3 border-t border-border/20">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{p.duration}</span>
                </div>
              )}
              {p.pickup_info && (
                <div className="text-[13px] text-foreground/80 pt-3 border-t border-border/20">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Pickup</div>
                  {p.pickup_info}
                </div>
              )}
              <Button className="w-full bg-champagne text-champagne-foreground hover:bg-champagne/90">
                Tenho interesse
              </Button>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
