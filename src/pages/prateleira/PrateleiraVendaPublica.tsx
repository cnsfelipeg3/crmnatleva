import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Check, X, Plane, Hotel, Star, CreditCard, Sparkles, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import LeadCaptureModal from "@/components/prateleira/LeadCaptureModal";
import PaymentPlanCard from "@/components/prateleira/PaymentPlanCard";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Product = any;

const KIND_LABEL: Record<string, string> = {
  aereo: "Passagem aérea",
  hospedagem: "Hospedagem",
  pacote: "Pacote completo",
  passeio: "Passeio",
  cruzeiro: "Cruzeiro",
  outros: "Experiência",
};

function formatDate(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd 'de' MMM yyyy", { locale: ptBR }); } catch { return d; }
}

function formatMoney(v?: number | null, currency = "BRL") {
  if (v == null) return null;
  const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${symbol} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function PrateleiraVendaPublica() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadOpen, setLeadOpen] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [agencyWhatsApp, setAgencyWhatsApp] = useState<string>("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*").eq("slug", slug).maybeSingle();
      setP(data);
      setLoading(false);

      // increment view_count fire and forget
      if (data?.id) {
        (supabase as any).from("experience_products")
          .update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", data.id);
      }

      // SEO
      if (data) {
        document.title = data.seo_title || `${data.title} · NatLeva`;
        const meta = document.querySelector('meta[name="description"]') || (() => {
          const m = document.createElement("meta"); m.setAttribute("name", "description"); document.head.appendChild(m); return m;
        })();
        meta.setAttribute("content", data.seo_description || data.short_description || `${data.title} · ${data.destination}`);
      }

      // Agency WhatsApp from agency_config
      const { data: cfg } = await (supabase as any).from("agency_config").select("whatsapp_number").maybeSingle();
      if (cfg?.whatsapp_number) setAgencyWhatsApp(cfg.whatsapp_number);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!p) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Produto não encontrado</p><Button onClick={() => navigate("/p")}>Ver vitrine</Button></div></div>;
  if (p.sale_page_enabled === false || p.status === "paused") {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Este produto está pausado no momento</p><Button onClick={() => navigate("/p")}>Ver outros produtos</Button></div></div>;
  }

  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const allImages = [p.cover_image_url, ...gallery.map((g: any) => g.url)].filter(Boolean) as string[];
  const cover = allImages[activeImg] || allImages[0];

  const dateRange = p.flexible_dates
    ? "Datas flexíveis · sob consulta"
    : (p.departure_date && p.return_date)
      ? `${formatDate(p.departure_date)} → ${formatDate(p.return_date)}`
      : p.departure_date ? `Saída ${formatDate(p.departure_date)}` : null;

  const fullPrice = formatMoney(p.price_from, p.currency);
  const promoPrice = formatMoney(p.price_promo, p.currency);
  const installmentsLine = p.installments_max ? `Em até ${p.installments_max}x${p.installments_no_interest ? ` (${p.installments_no_interest}x sem juros)` : ""}` : null;
  const pixLine = p.pix_discount_percent ? `${p.pix_discount_percent}% off no PIX` : null;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: p.title, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        {cover && (
          <div className="aspect-[16/9] sm:aspect-[21/9] max-h-[60vh] overflow-hidden bg-muted">
            <motion.img
              key={cover}
              src={cover}
              alt={p.title}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          </div>
        )}

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button variant="secondary" size="sm" onClick={() => navigate("/p")} className="bg-white/90 backdrop-blur">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Vitrine
          </Button>
          <Button variant="secondary" size="sm" onClick={share} className="bg-white/90 backdrop-blur">
            <Share2 className="w-4 h-4 mr-1.5" /> Compartilhar
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 text-white">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="secondary" className="bg-white/20 backdrop-blur text-white border-white/30">
                {KIND_LABEL[p.product_kind] || "Experiência"}
              </Badge>
              {p.is_promo && p.promo_badge && (
                <Badge className="bg-amber-500 text-black hover:bg-amber-500"><Sparkles className="w-3 h-3 mr-1" /> {p.promo_badge}</Badge>
              )}
              <span className="text-xs text-white/80 flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.destination}{p.destination_country ? `, ${p.destination_country}` : ""}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif leading-tight max-w-3xl">{p.title}</h1>
            {p.short_description && <p className="mt-3 text-white/90 text-sm sm:text-base max-w-2xl">{p.short_description}</p>}
            {dateRange && (
              <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4" /> {dateRange}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumb strip */}
      {allImages.length > 1 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-2 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allImages.map((url, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === activeImg ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"}`}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {Array.isArray(p.highlights) && p.highlights.length > 0 && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-4">Por que vale a pena</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {p.highlights.map((h: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {p.description && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-3">Sobre essa viagem</h2>
              <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{p.description}</div>
            </Card>
          )}

          {/* Logística */}
          {(p.airline || p.hotel_name || p.origin_city || p.nights) && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-4">Logística</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {p.origin_city && <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Saída:</span> {p.origin_city}{p.origin_iata ? ` (${p.origin_iata})` : ""}</span></div>}
                {p.airline && <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Cia aérea:</span> {p.airline}</span></div>}
                {p.hotel_name && <div className="flex items-center gap-2"><Hotel className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Hotel:</span> {p.hotel_name} {p.hotel_stars ? Array.from({ length: p.hotel_stars }).map((_, i) => <Star key={i} className="inline w-3 h-3 text-amber-500 fill-amber-500" />) : null}</span></div>}
                {p.nights && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Duração:</span> {p.nights} noite(s)</span></div>}
                {p.duration && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Tempo:</span> {p.duration}</span></div>}
              </div>
            </Card>
          )}

          {/* Includes / Excludes */}
          {((Array.isArray(p.includes) && p.includes.length > 0) || (Array.isArray(p.excludes) && p.excludes.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(p.includes) && p.includes.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-medium mb-3 text-emerald-700 dark:text-emerald-400 flex items-center gap-2"><Check className="w-4 h-4" /> Está incluso</h3>
                  <ul className="space-y-2 text-sm">
                    {p.includes.map((it: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 mt-1 shrink-0" /> <span>{it}</span></li>
                    ))}
                  </ul>
                </Card>
              )}
              {Array.isArray(p.excludes) && p.excludes.length > 0 && (
                <Card className="p-6">
                  <h3 className="font-medium mb-3 text-muted-foreground flex items-center gap-2"><X className="w-4 h-4" /> Não está incluso</h3>
                  <ul className="space-y-2 text-sm">
                    {p.excludes.map((it: string, i: number) => (
                      <li key={i} className="flex items-start gap-2"><X className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" /> <span>{it}</span></li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {p.how_it_works && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-3">Como funciona</h2>
              <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{p.how_it_works}</div>
            </Card>
          )}

          {p.recommendations && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-3">Recomendações</h2>
              <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{p.recommendations}</div>
            </Card>
          )}
        </div>

        {/* Sticky price card */}
        <div className="lg:col-span-1">
          <Card className="p-6 lg:sticky lg:top-6 space-y-4 border-amber-500/30">
            {(fullPrice || promoPrice) && (
              <div>
                {promoPrice && fullPrice && (
                  <div className="text-xs text-muted-foreground line-through">De {fullPrice}</div>
                )}
                <div className="text-3xl font-bold text-foreground">
                  {promoPrice || fullPrice}
                </div>
                {p.price_label && <div className="text-xs text-muted-foreground mt-0.5">{p.price_label}</div>}
              </div>
            )}

            {(() => {
              const pt = (p.payment_terms ?? {}) as any;
              const entryPercent = typeof pt.entry_percent === "number" ? pt.entry_percent : 30;
              const daysBefore = typeof pt.min_days_before_checkin === "number" ? pt.min_days_before_checkin : 20;
              const priceForPlan = p.price_promo ?? p.price_from;
              return (
                <div className="pt-3 border-t border-border/50">
                  <PaymentPlanCard
                    price={priceForPlan}
                    departureDate={p.departure_date}
                    currency={p.currency || "BRL"}
                    entryPercent={entryPercent}
                    daysBefore={daysBefore}
                  />
                </div>
              );
            })()}

            {p.seats_left != null && p.seats_left <= 5 && p.seats_left > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Apenas {p.seats_left} vaga(s) restante(s)
              </div>
            )}

            <Button size="lg" className="w-full" onClick={() => setLeadOpen(true)}>
              Tenho interesse
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">A NatLeva entra em contato no WhatsApp.</p>
          </Card>
        </div>
      </div>

      {/* Mobile floating CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3 z-40" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{promoPrice || fullPrice || "Sob consulta"}</div>
            {p.price_label && <div className="text-[10px] text-muted-foreground truncate">{p.price_label}</div>}
          </div>
          <Button onClick={() => setLeadOpen(true)} size="lg">Tenho interesse</Button>
        </div>
      </div>

      <LeadCaptureModal
        open={leadOpen}
        onOpenChange={setLeadOpen}
        product={{ id: p.id, slug: p.slug, title: p.title, whatsapp_cta_text: p.whatsapp_cta_text }}
        agencyWhatsApp={agencyWhatsApp}
      />
    </div>
  );
}
