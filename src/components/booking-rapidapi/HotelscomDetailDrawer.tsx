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
  X,
  Image as ImageIcon,
  Info,
  CheckCircle2,
  XCircle,
  Receipt,
  Sparkles,
  Wifi,
  Coffee,
  Car,
  Bath,
  Snowflake,
  Tv,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { HotelscomLodgingCard } from "./unifiedHotelTypes";

interface Props {
  card: HotelscomLodgingCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrival: string | null;
  departure: string | null;
  adults: number;
  converted?: {
    priceTotal?: number;
    priceStriked?: number;
    priceTaxes?: number;
    currency?: string;
  };
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

function AmenityIcon({ icon }: { icon?: string }) {
  const cls = "h-4 w-4";
  switch (icon) {
    case "wifi": return <Wifi className={cls} />;
    case "pool": return <span className={cls}>🏊</span>;
    case "parking": return <Car className={cls} />;
    case "breakfast":
    case "coffee": return <Coffee className={cls} />;
    case "bath": return <Bath className={cls} />;
    case "snowflake":
    case "air_conditioning": return <Snowflake className={cls} />;
    case "tv":
    case "screen": return <Tv className={cls} />;
    default: return <Sparkles className={cls} />;
  }
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

  const footerMessages =
    card.summarySections?.[0]?.footerMessages?.listItems ?? [];

  const priceMessages = card.priceSection?.priceSummary?.priceMessagingV2 ?? [];
  const reassurance = (card.priceSection?.priceSummary as any)?.reassuranceMessage?.value;
  const perNightMsg = card.priceSection?.priceSummary?.displayMessagesV2?.[0]
    ?.lineItems?.[0];
  const perNightText =
    perNightMsg?.state === "REASSURANCE_DISPLAY_QUALIFIER"
      ? perNightMsg.value
      : undefined;

  const copyInfo = async () => {
    const totalStr = converted?.priceTotal
      ? fmtBRL(converted.priceTotal, "BRL")
      : originalPriceFormatted ?? "—";

    const lines = [
      `🏨 ${name}`,
      location ? `📍 ${location}` : null,
      ratingScore
        ? `⭐ Nota: ${ratingScore}${ratingWord ? ` ${ratingWord}` : ""}${reviewCount ? ` (${reviewCount})` : ""}`
        : null,
      arrival && departure ? `📅 ${arrival} → ${departure}` : null,
      `👥 ${adults} adulto(s)`,
      `💰 Total: ${totalStr}`,
      converted?.priceTaxes
        ? `🧾 Impostos: ${fmtBRL(converted.priceTaxes, "BRL")}`
        : null,
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
    if (externalUrl) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
    }
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
          <SheetHeader className="p-6 pb-3 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                    Hotels.com
                  </Badge>
                </div>
                <SheetTitle className="text-xl line-clamp-2">{name}</SheetTitle>
                {location && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{location}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                  {ratingScore && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {ratingScore} {ratingWord}
                    </Badge>
                  )}
                  {reviewCount && (
                    <span className="text-muted-foreground">{reviewCount}</span>
                  )}
                  {arrival && departure && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {arrival} → {departure}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {converted?.priceTotal && (
              <Card className="mt-4 p-4 bg-muted/40">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estadia</span>
                    <span className="font-semibold">
                      {fmtBRL(converted.priceTotal, "BRL")}
                    </span>
                  </div>
                  {typeof converted.priceTaxes === "number" &&
                    converted.priceTaxes > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Impostos e taxas</span>
                        <span className="text-muted-foreground">
                          + {fmtBRL(converted.priceTaxes, "BRL")}
                        </span>
                      </div>
                    )}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="font-semibold">Total final</span>
                    <span className="text-lg font-bold text-foreground">
                      {fmtBRL(
                        (converted.priceTotal ?? 0) + (converted.priceTaxes ?? 0),
                        "BRL",
                      )}
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

            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={copyInfo}>
                <Copy className="h-3 w-3 mr-1.5" /> Copiar info
              </Button>
              {externalUrl && (
                <Button size="sm" variant="outline" onClick={openOnHotelscom}>
                  <ExternalLink className="h-3 w-3 mr-1.5" /> Abrir no Hotels.com
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="photos" className="px-6 pt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="photos">Fotos ({photos.length})</TabsTrigger>
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="raw">Dados</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="pt-4 pb-6">
              {photos.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Nenhuma foto disponível
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, idx) => {
                    const url =
                      (p.media as any)?.url_max750 ??
                      (p.media as any)?.url_max500 ??
                      p.media?.url;
                    if (!url) return null;
                    return (
                      <button
                        key={p.id ?? idx}
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
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <div className="absolute bottom-1 left-1 bg-background/90 text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" />
                            {photos.length} fotos
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="info" className="pt-4 pb-6 space-y-4">
              {amenities.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Comodidades
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {amenities.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <AmenityIcon icon={a.icon?.id} />
                        <span>{a.text || a.icon?.description}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {footerMessages.length > 0 && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Informações importantes
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {footerMessages.map((m, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {m.style === "POSITIVE" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : m.style === "NEGATIVE" ? (
                          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className="text-muted-foreground">{m.text}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {(perNightText || priceMessages.length > 0 || reassurance) && (
                <Card className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    Detalhes do preço
                  </h4>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {perNightText && (
                      <div className="flex items-center justify-between">
                        <span>Por noite</span>
                        <span className="font-medium text-foreground">{perNightText}</span>
                      </div>
                    )}
                    {priceMessages.map(
                      (m, i) =>
                        m.value && (
                          <p key={i} className="text-xs">
                            • {m.value}
                          </p>
                        ),
                    )}
                    {reassurance && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        ⚡ {reassurance}
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="raw" className="pt-4 pb-6">
              <Card className="p-4">
                <details>
                  <summary className="text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver JSON bruto (debug)
                  </summary>
                  <pre className="mt-3 text-[10px] overflow-x-auto bg-muted p-3 rounded max-h-96 overflow-y-auto">
                    {JSON.stringify(card, null, 2)}
                  </pre>
                </details>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>

      {/* Lightbox */}
      <Dialog
        open={galleryIdx !== null}
        onOpenChange={(o) => !o && closeGallery()}
      >
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-0">
          <DialogTitle className="sr-only">Galeria — {name}</DialogTitle>
          {galleryIdx !== null && photos[galleryIdx] && (
            <div className="relative w-full aspect-video flex items-center justify-center">
              <img
                src={
                  (photos[galleryIdx].media as any)?.url_max1024 ??
                  photos[galleryIdx].media?.url
                }
                alt={photos[galleryIdx].media?.description ?? `Foto ${galleryIdx + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={prevPhoto}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={nextPhoto}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 text-foreground text-xs px-2 py-1 rounded">
                    {galleryIdx + 1} / {photos.length}
                  </div>
                </>
              )}
              <Button
                size="icon"
                variant="secondary"
                onClick={closeGallery}
                className="absolute top-3 right-3 h-9 w-9 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
