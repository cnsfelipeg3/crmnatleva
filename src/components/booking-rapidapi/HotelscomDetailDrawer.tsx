import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  MapPin,
  Calendar,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Info,
  CheckCircle2,
  XCircle,
  Receipt,
  Sparkles,
  BedDouble,
  Users,
  CreditCard,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHotelscomFullDetails } from "@/hooks/useBookingRapidApi";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { convertPriceToBRL } from "./unifiedHotelTypes";
import type { HotelscomLodgingCard } from "./unifiedHotelTypes";
import {
  translateHotelscomCaption,
  translateHotelscomRatingWord,
  translateHotelscomText,
  translateHotelscomDistance,
} from "./hotelscomLocalization";
import {
  extractGallery,
  extractRooms as extractRoomsRich,
  extractAmenityGroups,
  extractLocation,
  extractRatingSummary,
  extractReviewsList,
  extractHeadline,
  extractAllOfferPerks,
  type HotelscomRoom,
} from "./hotelscomNormalizers";

interface Converted {
  priceTotal?: number;
  priceStriked?: number;
  priceTaxes?: number;
  pricePerNight?: number;
  currency?: string;
}

interface Props {
  card: HotelscomLodgingCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrival: string | null;
  departure: string | null;
  adults: number;
  converted?: Converted;
  /** ID composto "regionId_propertyId" pra buscar detalhes ricos. */
  propertyIdComposite?: string;
  /** Quando true, renderiza só o conteúdo interno (sem wrapper Sheet). */
  embedded?: boolean;
}

function fmtBRL(value?: number, currency?: string): string {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(0)}`;
  }
}

function translateMessage(raw: string | undefined, converted?: Converted): string | undefined {
  if (!raw) return raw;
  let s = raw;
  s = s.replace(/\bfor (\d+) nights?\b/i, (_, n) => `por ${n} noite${Number(n) > 1 ? "s" : ""}`);
  s = s.replace(/\bWe have (\d+) left at this price\b/i, (_, n) => `Restam ${n} unidade${Number(n) > 1 ? "s" : ""} nesse preço`);
  s = s.replace(/\bTotal with taxes and fees\b/i, "Total com impostos e taxas");
  s = s.replace(/\bper night\b/i, "por noite");
  if (/\bnightly\b/i.test(s) && converted?.pricePerNight) {
    return `${fmtBRL(converted.pricePerNight, converted.currency || "BRL")}/noite`;
  }
  s = s.replace(/\bnightly\b/i, "/noite");
  return translateHotelscomText(s);
}

function translateAmenity(text?: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    Pool: "Piscina",
    "Free WiFi": "Wi-Fi grátis",
    "Free Wi-Fi": "Wi-Fi grátis",
    WiFi: "Wi-Fi",
    Breakfast: "Café da manhã",
    "Breakfast included": "Café da manhã incluso",
    "Free breakfast": "Café da manhã grátis",
    Parking: "Estacionamento",
    "Free parking": "Estacionamento grátis",
    "Air conditioning": "Ar-condicionado",
    Kitchen: "Cozinha",
    Gym: "Academia",
    Spa: "Spa",
    Laundry: "Lavanderia",
    "Pet friendly": "Aceita pets",
    "Beach access": "Acesso à praia",
    Restaurant: "Restaurante",
    Bar: "Bar",
  };
  return map[text] ?? translateHotelscomText(text);
}

function translateCaption(en?: string): string | undefined {
  return translateHotelscomCaption(en);
}

// Extratores ricos vivem em ./hotelscomNormalizers

export function HotelscomDetailDrawer({
  card,
  open,
  onOpenChange,
  arrival,
  departure,
  adults,
  converted,
  propertyIdComposite,
  embedded = false,
}: Props) {
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  // Buscar detalhes ricos quando o drawer abre
  const propertyId = propertyIdComposite || (card?.propertyId as string | undefined) || null;
  const { data: details, isLoading: detailsLoading } = useHotelscomFullDetails(
    propertyId,
    arrival,
    departure,
    adults,
    open,
  );

  const { data: exchangeData } = useExchangeRates();
  const rates = exchangeData?.rates ?? null;

  // Galeria completa (do details-gallery), com fallback pras 3 fotos do card
  const galleryData = useMemo(
    () => extractGallery(details?.gallery),
    [details?.gallery],
  );
  const fullGalleryPhotos = useMemo(() => {
    if (galleryData.photos.length > 0) {
      return galleryData.photos.map((p) => ({ url: p.url, caption: p.caption }));
    }
    const fromCard = card?.mediaSection?.gallery?.media ?? [];
    return fromCard
      .map((p) => ({
        url:
          (p.media as any)?.url_max750 ??
          (p.media as any)?.url_max500 ??
          p.media?.url ??
          "",
        caption: p.media?.description,
      }))
      .filter((p) => p.url);
  }, [galleryData, card]);

  const richRooms = useMemo<HotelscomRoom[]>(
    () => extractRoomsRich(details?.offers),
    [details?.offers],
  );
  const amenitiesGroups = useMemo(
    () => extractAmenityGroups(details?.amenities),
    [details?.amenities],
  );
  const reviewsRich = useMemo(
    () => extractReviewsList(details?.reviewsList),
    [details?.reviewsList],
  );
  const ratingSummary = useMemo(
    () => extractRatingSummary(details?.ratingSummary),
    [details?.ratingSummary],
  );
  const locationRich = useMemo(
    () => extractLocation(details?.location),
    [details?.location],
  );
  const headlineRich = useMemo(
    () => extractHeadline(details?.headline),
    [details?.headline],
  );
  const offerPerks = useMemo(
    () => extractAllOfferPerks(details?.offers),
    [details?.offers],
  );

  if (!card) return null;

  const name = card.headingSection?.heading ?? "Hotel";
  const location = card.headingSection?.messages?.[0]?.text;
  const amenitiesShort = card.headingSection?.amenities ?? [];
  const externalUrl = card.cardLink?.resource?.value;

  const priceOpt = card.priceSection?.priceSummary?.optionsV2?.[0];
  const originalPriceFormatted =
    priceOpt?.formattedDisplayPrice ?? priceOpt?.displayPrice?.formatted;
  const originalStriked = priceOpt?.strikeOut?.formatted;
  const discountBadgeText = card.priceSection?.badge?.text;

  const rating = card.summarySections?.[0]?.guestRatingSectionV2;
  const ratingScore = rating?.badge?.text;
  const ratingWord = translateHotelscomRatingWord(
    rating?.phrases?.[0]?.phraseParts?.[0]?.text,
  );
  const reviewCount = rating?.phrases?.[1]?.phraseParts?.[0]?.text;

  const footerMessages = card.summarySections?.[0]?.footerMessages?.listItems ?? [];
  const priceMessages = card.priceSection?.priceSummary?.priceMessagingV2 ?? [];
  const reassurance = (card.priceSection?.priceSummary as any)?.reassuranceMessage?.value;
  const perNightMsg = card.priceSection?.priceSummary?.displayMessagesV2?.[0]?.lineItems?.[0];
  const perNightText =
    perNightMsg?.state === "REASSURANCE_DISPLAY_QUALIFIER" ? perNightMsg.value : undefined;

  // Promo badges do card
  const promoBadges: string[] = (() => {
    const out: string[] = [];
    const ev = (card as any).analyticsEvents?.find?.(
      (e: any) => e?.attribute?.name === "product_list",
    );
    if (!ev?.attribute?.content) return out;
    try {
      const parsed = JSON.parse(ev.attribute.content);
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      const raw: string[] = item?.lodging_product?.badges ?? [];
      for (const b of raw) {
        if (/Public_Promo/i.test(b)) out.push("Promoção pública");
        else if (/Member/i.test(b)) out.push("Oferta para membros");
        else if (/VIP/i.test(b)) out.push("VIP");
        else out.push(b.replace(/_/g, " "));
      }
      if (item?.free_cancellation_bool === true) out.push("Cancelamento grátis");
      if (item?.earn_eligible_bool === true) out.push("Elegível a pontos");
    } catch {
      /* ignore */
    }
    return out;
  })();

  const neighborhood: string | undefined = (() => {
    if (!externalUrl) return undefined;
    const m = externalUrl.match(/destination=([^&]+)/);
    if (!m) return undefined;
    try {
      return decodeURIComponent(m[1].replace(/\+/g, " ")).split(",")[0]?.trim();
    } catch {
      return undefined;
    }
  })();

  // Highlights/Headline (textuais ricos)
  const headlineText: string | undefined = translateHotelscomText(
    details?.headline?.headline?.text ??
      details?.headline?.text ??
      details?.content?.tagline?.text,
  );

  const overviewSections: Array<{ title: string; body: string }> = (() => {
    const out: Array<{ title: string; body: string }> = [];
    const high = details?.highlights;
    const items: any[] =
      high?.highlights ?? high?.items ?? high?.contentItems ?? [];
    if (Array.isArray(items)) {
      for (const it of items) {
        const title = translateHotelscomText(it?.heading ?? it?.title ?? it?.name);
        const body = translateHotelscomText(it?.body ?? it?.text ?? it?.description);
        if (title && body) out.push({ title, body });
      }
    }
    // Fallback do content
    const contentSections: any[] =
      details?.content?.aboutThisProperty?.sections ??
      details?.content?.sections ??
      [];
    if (out.length === 0 && Array.isArray(contentSections)) {
      for (const s of contentSections) {
        const title = translateHotelscomText(s?.heading ?? s?.title);
        const body = translateHotelscomText(s?.body?.text ?? s?.text ?? s?.description);
        if (title && body) out.push({ title, body });
      }
    }
    return out;
  })();

  // Localização (preferimos o normalizer rico)
  const latitude: number | undefined = locationRich.latitude;
  const longitude: number | undefined = locationRich.longitude;
  const fullAddress: string | undefined = locationRich.address;
  const editorialLocation: string | undefined = locationRich.editorial;
  const nearby = locationRich.nearby;

  // Políticas (do content)
  const policies: Array<{ title: string; body: string }> = (() => {
    const out: Array<{ title: string; body: string }> = [];
    const c = details?.content?.policies ?? details?.content?.propertyPolicies;
    if (Array.isArray(c)) {
      for (const p of c) {
        const title = p?.heading ?? p?.title;
        const body = p?.body?.text ?? p?.text ?? p?.description;
        if (title && body) out.push({ title, body });
      }
    }
    return out;
  })();

  const copyInfo = async () => {
    const totalStr = converted?.priceTotal
      ? fmtBRL(converted.priceTotal, "BRL")
      : originalPriceFormatted ?? "—";

    const lines = [
      `🏨 ${name}`,
      location ? `📍 ${location}` : null,
      ratingScore ? `⭐ Nota: ${ratingScore}${ratingWord ? ` ${ratingWord}` : ""}${reviewCount ? ` (${reviewCount})` : ""}` : null,
      arrival && departure ? `📅 ${arrival} → ${departure}` : null,
      `👥 ${adults} adulto(s)`,
      `💰 Total: ${totalStr}`,
      converted?.priceTaxes ? `🧾 Impostos: ${fmtBRL(converted.priceTaxes, "BRL")}` : null,
      ...footerMessages
        .filter((l) => l.style === "POSITIVE" && l.text)
        .map((l) => `✅ ${l.text}`),
      externalUrl ? `🔗 ${externalUrl}` : null,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Informações copiadas!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const openOnHotelscom = () => {
    if (externalUrl) window.open(externalUrl, "_blank", "noopener,noreferrer");
  };

  const openGallery = (idx: number) => setGalleryIdx(idx);
  const closeGallery = () => setGalleryIdx(null);
  const prevPhoto = () =>
    setGalleryIdx((i) =>
      i === null ? i : (i - 1 + fullGalleryPhotos.length) % fullGalleryPhotos.length,
    );
  const nextPhoto = () =>
    setGalleryIdx((i) =>
      i === null ? i : (i + 1) % fullGalleryPhotos.length,
    );

  const innerContent = (
    <ScrollArea className="flex-1 h-full">
      <div className="flex flex-col">
        <SheetHeader className="p-5 border-b space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-rose-500 text-white hover:bg-rose-500">
                  Hotels.com
                </Badge>
                {discountBadgeText && (
                  <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive font-bold">
                    🔥 {discountBadgeText}
                  </Badge>
                )}
                {detailsLoading && (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando detalhes…
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl leading-tight">{name}</SheetTitle>
              {(location || neighborhood) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{[location, neighborhood].filter(Boolean).join(" · ")}</span>
                </div>
              )}
              {headlineText && (
                <p className="text-sm text-foreground/80 italic">"{headlineText}"</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {ratingScore && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {ratingScore} {ratingWord}
                  </Badge>
                )}
                {reviewCount && (
                  <Badge variant="outline" className="text-xs">{reviewCount}</Badge>
                )}
                {arrival && departure && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    {arrival} → {departure}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {converted?.priceTotal && (
            <Card className="p-3 bg-muted/30">
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estadia</span>
                  <span className="font-medium">{fmtBRL(converted.priceTotal, "BRL")}</span>
                </div>
                {typeof converted.priceTaxes === "number" && converted.priceTaxes > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Impostos e taxas</span>
                    <span className="text-amber-700 dark:text-amber-500">
                      + {fmtBRL(converted.priceTaxes, "BRL")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="font-semibold">Total final</span>
                  <span className="font-bold text-base">
                    {fmtBRL((converted.priceTotal ?? 0) + (converted.priceTaxes ?? 0), "BRL")}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Preço convertido do USD · taxa aproximada
                </p>
                {originalPriceFormatted && (
                  <p className="text-[10px] text-muted-foreground">
                    Original (Hotels.com): {originalPriceFormatted}
                    {originalStriked && ` · riscado ${originalStriked}`}
                  </p>
                )}
              </div>
            </Card>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={copyInfo}>
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar info
            </Button>
            {externalUrl && (
              <Button size="sm" variant="outline" onClick={openOnHotelscom}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir no Hotels.com
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="p-5">
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7 h-auto gap-1">
            <TabsTrigger value="overview" className="text-xs">Visão</TabsTrigger>
            <TabsTrigger value="rooms" className="text-xs">
              Quartos {richRooms.length > 0 && `(${richRooms.length})`}
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-xs">
              Fotos ({fullGalleryPhotos.length})
            </TabsTrigger>
            <TabsTrigger value="amenities" className="text-xs">Comodidades</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">
              Avaliações {reviewsRich.length > 0 && `(${reviewsRich.length})`}
            </TabsTrigger>
            <TabsTrigger value="location" className="text-xs">Local</TabsTrigger>
            <TabsTrigger value="policies" className="text-xs">Políticas</TabsTrigger>
          </TabsList>

          {/* VISÃO GERAL */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {promoBadges.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sparkles className="h-4 w-4 text-rose-500" />
                  Selos & Promoções
                </h4>
                <div className="flex flex-wrap gap-2">
                  {promoBadges.map((b, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-rose-300 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
                    >
                      ⭐ {b}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {offerPerks.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Todas as ofertas incluem
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {offerPerks.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="text-foreground/80">
                        {translateAmenity(p.text)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {headlineRich.supportingMessages.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Destaques
                </h4>
                <ul className="space-y-1.5">
                  {headlineRich.supportingMessages.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-primary mt-0.5">•</span>
                      <span className="text-foreground/80">{m}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {amenitiesShort.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Comodidades em destaque
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {amenitiesShort.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-foreground/80">
                        {translateAmenity(a.text || a.icon?.description)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {detailsLoading && overviewSections.length === 0 && (
              <Card className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </Card>
            )}

            {overviewSections.length > 0 && (
              <Card className="p-4 space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4 text-primary" />
                  Sobre este hotel
                </h4>
                {overviewSections.map((s, i) => (
                  <div key={i} className="space-y-1">
                    <h5 className="text-sm font-medium">{s.title}</h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {s.body}
                    </p>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>

          {/* QUARTOS */}
          <TabsContent value="rooms" className="mt-4 space-y-3">
            {detailsLoading && (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}
            {!detailsLoading && richRooms.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma opção de quarto disponível
              </div>
            )}
            {richRooms.map((room, idx) => {
              const cheapest = room.rates[0];
              // Preço total em BRL (converte do USD se necessário)
              const totalUSD = cheapest?.totalValue;
              const totalCurrency = cheapest?.currency ?? "USD";
              const totalBRL = typeof totalUSD === "number"
                ? convertPriceToBRL(totalUSD, totalCurrency, rates).value
                : undefined;
              const perNightUSD = cheapest?.perNightValue;
              const perNightBRL = typeof perNightUSD === "number"
                ? convertPriceToBRL(perNightUSD, totalCurrency, rates).value
                : undefined;
              const strikeUSD = cheapest?.strikeValue;
              const strikeBRL = typeof strikeUSD === "number"
                ? convertPriceToBRL(strikeUSD, totalCurrency, rates).value
                : undefined;

              return (
                <Card key={room.id || idx} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-sm flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-primary" />
                        {room.name}
                      </h5>
                      {room.features.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {room.features.slice(0, 5).map((f, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className={cn(
                                "text-[10px] gap-1",
                                f.positive && "border-emerald-300 text-emerald-700 dark:text-emerald-400",
                              )}
                            >
                              {f.text}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {strikeBRL && (
                        <div className="text-[11px] text-muted-foreground line-through">
                          {fmtBRL(strikeBRL, "BRL")}
                        </div>
                      )}
                      {totalBRL ? (
                        <>
                          <div className="font-bold text-base">
                            {fmtBRL(totalBRL, "BRL")}
                          </div>
                          {perNightBRL && (
                            <p className="text-[10px] text-muted-foreground">
                              {fmtBRL(perNightBRL, "BRL")}/noite
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            {cheapest?.taxesLabel === "Total with taxes and fees"
                              ? "com impostos"
                              : "convertido do " + totalCurrency}
                          </p>
                        </>
                      ) : cheapest?.totalFormatted ? (
                        <div className="font-bold text-base">
                          {cheapest.totalFormatted}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {room.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {room.images.slice(0, 8).map((img, i) => (
                        <img
                          key={i}
                          src={img.url}
                          alt={img.caption ?? `${room.name} foto ${i + 1}`}
                          loading="lazy"
                          className="h-24 w-32 rounded-md object-cover shrink-0 bg-muted"
                        />
                      ))}
                    </div>
                  )}

                  {/* Tarifas (formas de pagamento, cancelamento, escassez) */}
                  <div className="space-y-2">
                    {room.rates.slice(0, 3).map((rate, ri) => (
                      <div
                        key={ri}
                        className="rounded-md border bg-muted/30 p-2.5 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rate.paymentLabel && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <CreditCard className="h-2.5 w-2.5" />
                              {rate.paymentLabel}
                            </Badge>
                          )}
                          {rate.cancellationLabel && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400 gap-1"
                            >
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {/free cancellation/i.test(rate.cancellationLabel)
                                ? "Cancelamento grátis"
                                : rate.cancellationLabel}
                            </Badge>
                          )}
                          {rate.dealBadge && (
                            <Badge className="text-[10px] bg-rose-500 hover:bg-rose-500 text-white">
                              🔥 {rate.dealBadge}
                            </Badge>
                          )}
                        </div>
                        {rate.paymentDescription && (
                          <p className="text-[11px] text-muted-foreground">
                            {translateMessage(rate.paymentDescription)}
                          </p>
                        )}
                        {rate.scarcityMessage && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-500 font-medium">
                            ⚡ {translateMessage(rate.scarcityMessage)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {room.amenities.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver {room.amenities.length} comodidades do quarto
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {room.amenities.map((a, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span className="text-foreground/80">{translateAmenity(a)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* FOTOS */}
          <TabsContent value="photos" className="mt-4">
            {fullGalleryPhotos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {detailsLoading ? "Carregando galeria…" : "Nenhuma foto disponível"}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fullGalleryPhotos.map((p, idx) => {
                  const captionPt = translateCaption(p.caption);
                  return (
                    <button
                      key={idx}
                      onClick={() => openGallery(idx)}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-md bg-muted",
                        "transition-transform duration-200 hover:scale-[1.02]",
                      )}
                    >
                      <img
                        src={p.url}
                        alt={p.caption ?? `Foto ${idx + 1}`}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      {captionPt && (
                        <div className="absolute top-1 left-1 right-1 truncate inline-flex items-center rounded bg-background/85 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
                          {captionPt}
                        </div>
                      )}
                      {idx === 0 && (
                        <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-background/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium">
                          <ImageIcon className="h-2.5 w-2.5" />
                          {fullGalleryPhotos.length} fotos
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* COMODIDADES */}
          <TabsContent value="amenities" className="mt-4 space-y-3">
            {detailsLoading && amenitiesGroups.length === 0 && (
              <Skeleton className="h-40 w-full" />
            )}
            {amenitiesGroups.length === 0 && !detailsLoading && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma comodidade detalhada disponível
              </div>
            )}
            {amenitiesGroups.map((g, i) => (
              <Card key={i} className="p-4">
                <h5 className="font-semibold text-sm mb-2">{g.title}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {g.items.map((it, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="text-foreground/80">{translateAmenity(it.text)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* AVALIAÇÕES */}
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {(ratingSummary.score || ratingSummary.totalReviews) && (
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-primary">
                    {ratingSummary.score ?? "—"}
                  </div>
                  <div>
                    {ratingSummary.label && (
                      <div className="font-semibold text-sm">{ratingSummary.label}</div>
                    )}
                    {ratingSummary.totalReviews && (
                      <div className="text-xs text-muted-foreground">
                        {ratingSummary.totalReviews.toLocaleString("pt-BR")} avaliações
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {detailsLoading && reviewsRich.length === 0 && (
              <Skeleton className="h-32 w-full" />
            )}
            {reviewsRich.length === 0 && !detailsLoading && !ratingSummary.score && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma avaliação detalhada disponível
              </div>
            )}
            {reviewsRich.slice(0, 12).map((r, i) => (
              <Card key={r.id || i} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">
                      {r.authorContext ?? "Hóspede"}
                    </span>
                    {r.date && (
                      <span className="text-muted-foreground shrink-0">· {r.date}</span>
                    )}
                  </div>
                  {r.score && (
                    <Badge variant="secondary" className="gap-1 shrink-0">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {r.score}
                    </Badge>
                  )}
                </div>
                {r.title && (
                  <p className="text-xs font-semibold text-foreground/90">{r.title}</p>
                )}
                {r.text && (
                  <p className="text-xs text-foreground/80 line-clamp-5">{r.text}</p>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* LOCALIZAÇÃO */}
          <TabsContent value="location" className="mt-4 space-y-3">
            <Card className="p-4 space-y-2">
              <h5 className="font-semibold text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Endereço
              </h5>
              {fullAddress ? (
                <p className="text-sm text-foreground/80">{fullAddress}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {[location, neighborhood].filter(Boolean).join(" · ") || "—"}
                </p>
              )}
              {latitude && longitude && (
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir no Google Maps
                </a>
              )}
            </Card>

            {editorialLocation && (
              <Card className="p-4">
                <h5 className="font-semibold text-sm mb-2">Sobre a localização</h5>
                <p className="text-xs text-foreground/80 whitespace-pre-line">
                  {editorialLocation}
                </p>
              </Card>
            )}

            {nearby.length > 0 && (
              <Card className="p-4">
                <h5 className="font-semibold text-sm mb-2">Pontos próximos</h5>
                <div className="space-y-1.5">
                  {nearby.slice(0, 15).map((n, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-foreground/80 truncate">{n.name}</span>
                      {n.distance && (
                        <span className="text-muted-foreground shrink-0">
                          {n.distance}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* POLÍTICAS */}
          <TabsContent value="policies" className="mt-4 space-y-3">
            {footerMessages.length > 0 && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Info className="h-4 w-4 text-primary" />
                  Informações importantes
                </h4>
                <div className="space-y-2">
                  {footerMessages.map((m, i) => {
                    const text = (m.text || "")
                      .replace(/^Fully refundable$/i, "Totalmente reembolsável")
                      .replace(/^Non refundable$/i, "Não reembolsável")
                      .replace(/^Free cancellation$/i, "Cancelamento grátis")
                      .replace(/^Breakfast included$/i, "Café da manhã incluso")
                      .replace(/^Free Wi-?Fi$/i, "Wi-Fi grátis")
                      .replace(/^Free parking$/i, "Estacionamento grátis")
                      .replace(/\bfree cancellation\b/gi, "cancelamento grátis");
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {m.style === "POSITIVE" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        ) : m.style === "NEGATIVE" ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                        ) : (
                          <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        )}
                        <span className="text-foreground/80">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {(perNightText || priceMessages.length > 0 || reassurance) && (
              <Card className="p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Receipt className="h-4 w-4 text-primary" />
                  Detalhes do preço
                </h4>
                <div className="space-y-1.5 text-sm">
                  {perNightText && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Por noite</span>
                      <span className="font-medium">
                        {translateMessage(perNightText, converted)}
                      </span>
                    </div>
                  )}
                  {priceMessages.map(
                    (m, i) =>
                      m.value && (
                        <div key={i} className="text-xs text-muted-foreground">
                          • {translateMessage(m.value, converted)}
                        </div>
                      ),
                  )}
                  {reassurance && (
                    <div className="text-xs text-amber-700 dark:text-amber-500 pt-1">
                      ⚡ {translateMessage(reassurance, converted)}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {policies.length > 0 && (
              <Card className="p-4 space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Políticas da propriedade
                </h4>
                {policies.map((p, i) => (
                  <div key={i} className="space-y-1">
                    <h5 className="text-xs font-semibold">{p.title}</h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {p.body}
                    </p>
                  </div>
                ))}
              </Card>
            )}

            {!detailsLoading && policies.length === 0 && footerMessages.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma política detalhada disponível
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );

  const lightbox = (
    <Dialog open={galleryIdx !== null} onOpenChange={(o) => !o && closeGallery()}>
      <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
        <DialogTitle className="sr-only">Galeria — {name}</DialogTitle>
        {galleryIdx !== null && fullGalleryPhotos[galleryIdx] && (
          <div className="relative aspect-[16/10] flex items-center justify-center">
            <img
              src={fullGalleryPhotos[galleryIdx].url}
              alt={fullGalleryPhotos[galleryIdx].caption ?? ""}
              className="max-h-full max-w-full object-contain"
            />
            {fullGalleryPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/30 hover:bg-background/60 backdrop-blur p-2 rounded-full"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/30 hover:bg-background/60 backdrop-blur p-2 rounded-full"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/50 backdrop-blur px-3 py-1 rounded-full text-xs text-white">
                  {galleryIdx + 1} / {fullGalleryPhotos.length}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  if (embedded) {
    return (
      <>
        {innerContent}
        {lightbox}
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        {innerContent}
      </SheetContent>
      {lightbox}
    </Sheet>
  );
}
