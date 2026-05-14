import { useEffect, useRef, useState } from "react";
import { initViewerTracking } from "@/lib/prateleira/viewerTracking";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Check, X, Plane, Hotel, Star, CreditCard, Sparkles, ArrowLeft, Share2, Images } from "lucide-react";
import { motion } from "framer-motion";
import PrateleiraEmailGate from "@/components/prateleira/PrateleiraEmailGate";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";
import { buildWhatsAppLink } from "@/components/ui/phone-input";
import CinematicHero from "@/components/prateleira/CinematicHero";
import OfferStack from "@/components/prateleira/OfferStack";
import SalesTriggersBlock from "@/components/prateleira/SalesTriggersBlock";
import PublicFooter from "@/components/prateleira/PublicFooter";
import GalleryModal from "@/components/prateleira/GalleryModal";
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

function buildCtaMessage(p: any): string {
  if (p.whatsapp_cta_text && String(p.whatsapp_cta_text).trim()) return String(p.whatsapp_cta_text).trim();
  const parts: string[] = [];
  parts.push(`Olá! Tenho interesse no pacote "${p.title}".`);
  const pay: string[] = [];
  if (p.installments_max && p.installments_max > 1) {
    pay.push(`parcelado em até ${p.installments_max}x${p.installments_no_interest ? " sem juros" : ""}`);
  }
  if (p.pix_discount_percent && p.pix_discount_percent > 0) {
    pay.push(`com ${p.pix_discount_percent}% de desconto no PIX`);
  }
  if (p.payment_terms && String(p.payment_terms).trim() && pay.length === 0) {
    const t = String(p.payment_terms).trim().replace(/\s+/g, " ");
    pay.push(t.length > 80 ? t.slice(0, 77) + "..." : t);
  }
  if (pay.length) parts.push(`Forma de pagamento: ${pay.join(" · ")}.`);
  if (p.departure_date) {
    try {
      const d = new Date(p.departure_date + "T00:00:00");
      parts.push(`Saída prevista: ${d.toLocaleDateString("pt-BR")}.`);
    } catch {}
  }
  parts.push("Pode me passar as próximas etapas?");
  let msg = parts.join(" ");
  if (msg.length > 380) msg = msg.slice(0, 377) + "...";
  return msg;
}

export default function PrateleiraVendaPublica() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const hasInternalHistory = location.key !== "default";
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [agencyWhatsApp, setAgencyWhatsApp] = useState<string>("");
  const [unlocked, setUnlocked] = useState(false);
  const [gateLoading, setGateLoading] = useState(false);
  const trackerRef = useRef<ReturnType<typeof initViewerTracking> | null>(null);

  // Print mode bypassa o gate (PDF/render server)
  const isPrintMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*").eq("slug", slug).maybeSingle();
      setP(data);
      setLoading(false);

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

      // Já desbloqueado nessa sessão?
      try {
        const cached = sessionStorage.getItem(`prateleira_viewer_${slug}`);
        if (cached || isPrintMode) setUnlocked(true);
      } catch {}
    })();
  }, [slug, isPrintMode]);

  // Inicia tracking de tempo + cliques + seções vistas após o gate
  useEffect(() => {
    if (!unlocked || !p?.id || isPrintMode) return;
    let email = "";
    try { email = sessionStorage.getItem(`prateleira_viewer_${slug}`) || ""; } catch {}
    if (!email) return;
    trackerRef.current = initViewerTracking({ productId: p.id, email });
    return () => { trackerRef.current?.dispose(); trackerRef.current = null; };
  }, [unlocked, p?.id, slug, isPrintMode]);

  const handleGateSubmit = async ({ name, email, phone, countryCode }: { name: string; email: string; phone: string; countryCode: string }) => {
    if (!p?.id) return;
    setGateLoading(true);
    try {
      const ua = navigator.userAgent || "";
      const deviceType = /mobile|android|iphone/i.test(ua) ? "mobile" : /ipad|tablet/i.test(ua) ? "tablet" : "desktop";

      // Geo lookup (best effort)
      let geo: any = {};
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (r.ok) geo = await r.json();
      } catch {}

      const utm = new URLSearchParams(window.location.search);

      // Upsert viewer (unique product_id + email)
      const { data: existing } = await (supabase as any)
        .from("prateleira_product_viewers")
        .select("id, total_views")
        .eq("product_id", p.id)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        await (supabase as any).from("prateleira_product_viewers").update({
          name, phone, country_code: countryCode,
          device_type: deviceType, user_agent: ua.slice(0, 500),
          ip_address: geo.ip || null,
          city: geo.city || null, region: geo.region || null, country: geo.country_name || null,
          latitude: geo.latitude || null, longitude: geo.longitude || null,
          total_views: (existing.total_views || 1) + 1,
          last_active_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await (supabase as any).from("prateleira_product_viewers").insert({
          product_id: p.id,
          product_slug: p.slug,
          email, name, phone, country_code: countryCode,
          device_type: deviceType, user_agent: ua.slice(0, 500),
          ip_address: geo.ip || null,
          city: geo.city || null, region: geo.region || null, country: geo.country_name || null,
          latitude: geo.latitude || null, longitude: geo.longitude || null,
          utm_source: utm.get("utm_source"),
          utm_medium: utm.get("utm_medium"),
          utm_campaign: utm.get("utm_campaign"),
          utm_content: utm.get("utm_content"),
          utm_term: utm.get("utm_term"),
        });

        // Increment view_count apenas para visitas únicas
        (supabase as any).from("experience_products")
          .update({ view_count: (p.view_count ?? 0) + 1 }).eq("id", p.id);
      }

      try {
        sessionStorage.setItem(`prateleira_viewer_${slug}`, email);
      } catch {}
      setUnlocked(true);
    } catch (err: any) {
      toast.error("Não foi possível liberar o acesso", { description: err?.message });
    } finally {
      setGateLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!p) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Produto não encontrado</p><Button onClick={() => navigate("/p")}>Ver vitrine</Button></div></div>;
  if (p.sale_page_enabled === false || p.status === "paused") {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Este produto está pausado no momento</p><Button onClick={() => navigate("/p")}>Ver outros produtos</Button></div></div>;
  }

  // Gate de captura · libera após preencher nome, e-mail e WhatsApp
  if (!unlocked) {
    return (
      <PrateleiraEmailGate
        productTitle={p.title}
        destination={[p.destination, p.destination_country].filter(Boolean).join(" · ")}
        coverImage={p.cover_image_url || (Array.isArray(p.gallery) && p.gallery[0]?.url)}
        loading={gateLoading}
        onSubmit={handleGateSubmit}
      />
    );
  }

  const gallery = Array.isArray(p.gallery) ? p.gallery : [];
  const allImages = Array.from(
    new Set([p.cover_image_url, ...gallery.map((g: any) => g.url)].filter(Boolean) as string[])
  );
  const cover = allImages[0];
  const openGallery = (i: number = 0) => {
    setGalleryIdx(i);
    setGalleryOpen(true);
  };

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
    trackerRef.current?.trackClick("share_button", "hero");
    if (navigator.share) {
      try { await navigator.share({ title: p.title, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  const handleCTA = async () => {
    // Lead já foi capturado no gate · vai direto pro WhatsApp com mensagem do pacote
    if (!agencyWhatsApp) {
      toast.error("WhatsApp da agência não configurado");
      return;
    }
    const msg = buildCtaMessage(p);
    try {
      const email = sessionStorage.getItem(`prateleira_viewer_${slug}`);
      if (email) {
        (supabase as any).from("prateleira_product_viewers")
          .update({
            cta_clicked: true,
            whatsapp_clicked: true,
            last_active_at: new Date().toISOString(),
          })
          .eq("product_id", p.id).eq("email", email);
      }
      trackerRef.current?.trackClick("cta_whatsapp", "offer", { agency_whatsapp: !!agencyWhatsApp });
      (supabase as any).from("experience_products")
        .update({ lead_count: (p.lead_count ?? 0) + 1 }).eq("id", p.id);
    } catch {}
    window.open(buildWhatsAppLink(agencyWhatsApp, msg), "_blank");
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
        onBack={() => {
          // Volta instantâneo via histórico do SPA (preserva cache da vitrine, scroll e estado de filtros)
          if (hasInternalHistory) navigate(-1);
          else navigate("/p");
        }}
        onShare={share}
        galleryCount={allImages.length}
        onOpenGallery={() => openGallery(0)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Main */}
        <div className="lg:col-span-3 space-y-6">
          {Array.isArray(p.highlights) && p.highlights.length > 0 && (
            <Card className="p-6" data-section="highlights">
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
            <Card className="p-6" data-section="description">
              <h2 className="font-serif text-xl mb-3">Sobre essa viagem</h2>
              <div className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{p.description}</div>
            </Card>
          )}

          {/* Galeria de fotos · visível e clicável */}
          {allImages.length > 0 && (
            <Card className="p-6" data-section="gallery">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl flex items-center gap-2">
                  <Images className="w-5 h-5 text-muted-foreground" />
                  Galeria
                  <span className="text-xs font-sans text-muted-foreground tabular-nums font-normal">
                    {allImages.length} {allImages.length === 1 ? "foto" : "fotos"}
                  </span>
                </h2>
                {allImages.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => { trackerRef.current?.trackClick("gallery_open_all", "gallery"); openGallery(0); }} className="text-xs">
                    Ver todas
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allImages.slice(0, 6).map((url, i) => {
                  const isLast = i === 5 && allImages.length > 6;
                  return (
                    <button
                      key={i}
                      onClick={() => { trackerRef.current?.trackClick(`gallery_thumb_${i}`, "gallery"); openGallery(i); }}
                      className="relative aspect-[4/3] overflow-hidden rounded-lg group bg-muted"
                      aria-label={`Abrir foto ${i + 1}`}
                    >
                      <img
                        src={url}
                        alt={`${p.title} · foto ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {isLast && (
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-sm">
                          +{allImages.length - 6} fotos
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Logística */}
          {(p.airline || p.hotel_name || p.origin_city || p.nights || p.departure_date || p.return_date) && (
            <Card className="p-6">
              <h2 className="font-serif text-xl mb-4">Logística</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {p.origin_city && <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Saída:</span> {p.origin_city}{p.origin_iata ? ` (${p.origin_iata})` : ""}</span></div>}
                {p.airline && <div className="flex items-center gap-2"><Plane className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Cia aérea:</span> {p.airline}</span></div>}
                {p.hotel_name && <div className="flex items-center gap-2"><Hotel className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Hotel:</span> {p.hotel_name} {p.hotel_stars ? Array.from({ length: p.hotel_stars }).map((_, i) => <Star key={i} className="inline w-3 h-3 text-amber-500 fill-amber-500" />) : null}</span></div>}
                {p.departure_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Data de ida:</span> {formatDate(p.departure_date)}</span></div>}
                {p.return_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /> <span><span className="text-muted-foreground">Data de volta:</span> {formatDate(p.return_date)}</span></div>}
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
        <div className="lg:col-span-2">
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
            paxMin={p.pax_min}
            paxMax={p.pax_max}
            productId={p.id}
            onCTA={handleCTA}
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
        {(() => {
          const pt = (p.payment_terms ?? {}) as any;
          const mobilePlan = computeNatlevaPlan(p.price_promo ?? p.price_from, p.departure_date, {
            entryPercent: typeof pt.entry_percent === "number" ? pt.entry_percent : 30,
            entryAmount: typeof pt.entry_amount === "number" && pt.entry_amount > 0 ? pt.entry_amount : undefined,
            daysBefore: typeof pt.min_days_before_checkin === "number" ? pt.min_days_before_checkin : 20,
            currency: p.currency || "BRL",
          });
          return (
            <div className="flex items-center gap-3 p-3">
              <div className="flex-1 min-w-0">
                {mobilePlan ? (
                  <>
                    <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground font-semibold leading-none">
                      Boleto sem juros
                    </div>
                    <div className="text-base sm:text-lg font-bold tabular-nums leading-tight mt-0.5 truncate">
                      {mobilePlan.installments}x de {formatMoneyBR(mobilePlan.installmentAmount, mobilePlan.currency)}
                    </div>
                    <div className="text-[10px] text-muted-foreground/90 leading-tight truncate">
                      Entrada {formatMoneyBR(mobilePlan.entryAmount, mobilePlan.currency)}
                      <span className="text-muted-foreground/60"> · total {formatMoneyBR(mobilePlan.total, mobilePlan.currency)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold truncate tabular-nums">
                      {promoPrice || fullPrice || "Sob consulta"}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {p.price_label || "entrada + saldo sem juros"}
                    </div>
                  </>
                )}
              </div>
              <motion.button
                onClick={handleCTA}
                whileTap={{ scale: 0.96 }}
                className="relative overflow-hidden h-12 px-5 rounded-xl bg-foreground text-background font-semibold text-sm flex items-center gap-2 shadow-lg shrink-0"
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
          );
        })()}
      </div>


      <PublicFooter />

      <GalleryModal
        open={galleryOpen}
        images={allImages}
        initialIndex={galleryIdx}
        onClose={() => setGalleryOpen(false)}
        title={p.title}
      />
    </div>
  );
}
