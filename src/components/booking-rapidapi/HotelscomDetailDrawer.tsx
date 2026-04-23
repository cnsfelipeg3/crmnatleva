import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HotelscomLodgingCard } from "./unifiedHotelTypes";

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
  return s;
}

function translateAmenity(text?: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "Pool": "Piscina",
    "Free WiFi": "Wi-Fi grátis",
    "Free Wi-Fi": "Wi-Fi grátis",
    "WiFi": "Wi-Fi",
    "Breakfast": "Café da manhã",
    "Breakfast included": "Café da manhã incluso",
    "Free breakfast": "Café da manhã grátis",
    "Parking": "Estacionamento",
    "Free parking": "Estacionamento grátis",
    "Air conditioning": "Ar-condicionado",
    "Kitchen": "Cozinha",
    "Gym": "Academia",
    "Spa": "Spa",
    "Laundry": "Lavanderia",
    "Pet friendly": "Aceita pets",
    "Beach access": "Acesso à praia",
    "Restaurant": "Restaurante",
    "Bar": "Bar",
  };
  return map[text] ?? text;
}

export function HotelscomDetailDrawer({
  card,
  open,
  onOpenChange,
  arrival,
  departure,
  adults,
  converted,
}: Props) {
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  if (!card) return null;

  const name = card.headingSection?.heading ?? "Hotel";
  const location = card.headingSection?.messages?.[0]?.text;
  const amenities = card.headingSection?.amenities ?? [];
  const photos = card.mediaSection?.gallery?.media ?? [];
  const externalUrl = card.cardLink?.resource?.value;

  const priceOpt = card.priceSection?.priceSummary?.optionsV2?.[0];
  const originalPriceFormatted =
    priceOpt?.formattedDisplayPrice ?? priceOpt?.displayPrice?.formatted;
  const originalStriked = priceOpt?.strikeOut?.formatted;

  const rating = card.summarySections?.[0]?.guestRatingSectionV2;
  const ratingScore = rating?.badge?.text;
  const ratingWord = rating?.phrases?.[0]?.phraseParts?.[0]?.text;
  const reviewCount = rating?.phrases?.[1]?.phraseParts?.[0]?.text;

  const footerMessages = card.summarySections?.[0]?.footerMessages?.listItems ?? [];
  const priceMessages = card.priceSection?.priceSummary?.priceMessagingV2 ?? [];
  const reassurance = (card.priceSection?.priceSummary as any)?.reassuranceMessage?.value;
  const perNightMsg = card.priceSection?.priceSummary?.displayMessagesV2?.[0]?.lineItems?.[0];
  const perNightText =
    perNightMsg?.state === "REASSURANCE_DISPLAY_QUALIFIER" ? perNightMsg.value : undefined;

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
    setGalleryIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const nextPhoto = () =>
    setGalleryIdx((i) => (i === null ? i : (i + 1) % photos.length));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <SheetHeader className="p-5 border-b space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-rose-500 text-white hover:bg-rose-500">
                    Hotels.com
                  </Badge>
                </div>
                <SheetTitle className="text-xl leading-tight">{name}</SheetTitle>
                {location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{location}</span>
                  </div>
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

          <Tabs defaultValue="photos" className="p-5">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="photos">Fotos ({photos.length})</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="raw">Dados</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="mt-4">
              {photos.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhuma foto disponível
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {photos.map((p, idx) => {
                    const url =
                      (p.media as any)?.url_max750 ??
                      (p.media as any)?.url_max500 ??
                      p.media?.url;
                    if (!url) return null;
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
                          src={url}
                          alt={p.media?.description ?? `Foto ${idx + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-background/90 backdrop-blur px-1.5 py-0.5 text-[10px] font-medium">
                            <ImageIcon className="h-2.5 w-2.5" />
                            {photos.length} fotos
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="mt-4 space-y-4">
              {amenities.length > 0 && (
                <Card className="p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Comodidades
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {amenities.map((a, i) => (
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
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <Card className="p-3">
                <details>
                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground mb-2">
                    Ver JSON bruto (debug)
                  </summary>
                  <pre className="text-[10px] overflow-x-auto bg-muted p-2 rounded mt-2 max-h-96">
                    {JSON.stringify(card, null, 2)}
                  </pre>
                </details>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>

      {/* Lightbox */}
      <Dialog open={galleryIdx !== null} onOpenChange={(o) => !o && closeGallery()}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">Galeria — {name}</DialogTitle>
          {galleryIdx !== null && photos[galleryIdx] && (
            <div className="relative aspect-[16/10] flex items-center justify-center">
              <img
                src={
                  (photos[galleryIdx].media as any)?.url_max750 ??
                  photos[galleryIdx].media?.url
                }
                alt={photos[galleryIdx].media?.description ?? ""}
                className="max-h-full max-w-full object-contain"
              />
              {photos.length > 1 && (
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
                    {galleryIdx + 1} / {photos.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
