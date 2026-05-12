import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Check, X, Plane, Hotel, Star, CreditCard, Sparkles, ArrowLeft, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import LeadCaptureModal from "@/components/prateleira/LeadCaptureModal";
import CinematicHero from "@/components/prateleira/CinematicHero";
import OfferStack from "@/components/prateleira/OfferStack";
import SalesTriggersBlock from "@/components/prateleira/SalesTriggersBlock";
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
      {/* Hero cinematográfico */}
      <CinematicHero
        cover={cover}
        title={p.title}
        shortDescription={p.short_description}
        destination={p.destination}
        destinationCountry={p.destination_country}
        kindLabel={KIND_LABEL[p.product_kind] || "Experiência"}
        promoBadge={p.promo_badge}
        isPromo={!!p.is_promo}
        dateRange={dateRange}
        onBack={() => navigate("/p")}
        onShare={share}
      />

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
          {/* Gatilhos estratégicos · prova social, manifesto, garantias */}
          <SalesTriggersBlock destination={p.destination} productKind={p.product_kind} />
        </div>

        {/* Sticky offer stack */}
        <div className="lg:col-span-1">
          <OfferStack
            promoPrice={promoPrice}
            fullPrice={fullPrice}
            priceLabel={p.price_label}
            isPromo={!!p.is_promo}
            promoBadge={p.promo_badge}
            seatsLeft={p.seats_left}
            pixDiscountPercent={p.pix_discount_percent}
            installmentsMax={p.installments_max}
            installmentsNoInterest={p.installments_no_interest}
            rawPriceFrom={p.price_from}
            rawPricePromo={p.price_promo}
            currency={p.currency || "BRL"}
            departureDate={p.departure_date}
            paymentTerms={p.payment_terms}
            productId={p.id}
            onCTA={() => setLeadOpen(true)}
          />
        </div>
      </div>

      {/* Mobile floating CTA · com gatilho */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border z-40 shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.25)]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {p.seats_left != null && p.seats_left <= 5 && p.seats_left > 0 && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 px-3 py-1 text-center">
            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              Apenas {p.seats_left} {p.seats_left === 1 ? "vaga" : "vagas"} · garanta a sua
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate tabular-nums">
              {promoPrice || fullPrice || "Sob consulta"}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">
              {p.price_label || "entrada + saldo sem juros"}
            </div>
          </div>
          <motion.button
            onClick={() => setLeadOpen(true)}
            whileTap={{ scale: 0.96 }}
            className="relative overflow-hidden h-12 px-5 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center gap-2 shadow-lg"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
              style={{
                background:
                  "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.35) 50%, transparent 60%)",
              }}
            />
            <span className="relative">Garantir vaga</span>
          </motion.button>
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
