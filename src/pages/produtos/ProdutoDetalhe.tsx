import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Clock, MapPin, Check, X, Sparkles, Info, Pencil, ExternalLink, Lock, Copy, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import GeneratePaymentLinkDialog from "@/components/prateleira/GeneratePaymentLinkDialog";

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
  emission_link: string | null;
};

export default function ProdutoDetalhe() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isCeo = role === "admin" || role === "gestor";
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [payLinkOpen, setPayLinkOpen] = useState(false);


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
        <div className="flex items-center gap-2">
          {isCeo && p.emission_link && (
            <>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-black"
                onClick={() => window.open(p.emission_link!, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Link para Emissão
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(p.emission_link!);
                    toast.success("Link copiado");
                  } catch {
                    toast.error("Não foi possível copiar");
                  }
                }}
                title="Copiar link de emissão"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {isCeo && !p.emission_link && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground px-2.5 py-1 rounded-md border border-dashed border-border/60">
              <Lock className="w-3 h-3" /> Sem link de emissão cadastrado
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPayLinkOpen(true)}
            className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
          >
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Gerar link de pagamento
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/produtos/${p.slug}/editar`)}>
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
          </Button>
        </div>
      </div>

      <GeneratePaymentLinkDialog
        open={payLinkOpen}
        onOpenChange={setPayLinkOpen}
        productId={p.id}
        productTitle={p.title}
        hasEntryPlan={!!(p as any).payment_terms}
      />


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
