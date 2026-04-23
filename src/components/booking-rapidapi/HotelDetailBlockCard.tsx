import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Copy,
  ExternalLink,
  CheckCircle2,
  Wifi,
  Coffee,
  Bath,
  Snowflake,
  Tv,
  Car,
  Utensils,
  Bed,
  Ruler,
  Ban,
  ShieldCheck,
  Flame,
  ChevronLeft,
  ChevronRight,
  X,
  Image as ImageIcon,
  Gift,
  DollarSign,
  RefreshCw,
  Dumbbell,
  Accessibility,
  PawPrint,
  Baby,
  Cigarette,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import type {
  BookingBlock,
  BookingRoomDetails,
} from "./types";

/** Ícone por nome (string) — suporta ícones do Booking */
export function FacilityIcon({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  const cls = className ?? "h-4 w-4";
  const clean = (icon || "").toLowerCase().replace("iconset/", "");
  switch (clean) {
    case "wifi":
      return <Wifi className={cls} />;
    case "pool":
      return <span className={cls}>🏊</span>;
    case "parking":
    case "parking_sign":
      return <Car className={cls} />;
    case "coffee":
    case "breakfast":
      return <Coffee className={cls} />;
    case "bath":
      return <Bath className={cls} />;
    case "snowflake":
    case "air_conditioning":
      return <Snowflake className={cls} />;
    case "tv":
    case "screen":
      return <Tv className={cls} />;
    case "food":
    case "food_and_drink":
    case "fooddrink":
    case "restaurant":
      return <Utensils className={cls} />;
    case "fitness":
    case "gym":
      return <Dumbbell className={cls} />;
    case "disabled":
      return <Accessibility className={cls} />;
    case "pawprint":
    case "pet":
      return <PawPrint className={cls} />;
    case "family":
      return <Baby className={cls} />;
    case "nosmoking":
      return <Cigarette className={cls} />;
    case "city":
      return <MapPin className={cls} />;
    case "bed":
      return <Bed className={cls} />;
    case "heater":
      return <Flame className={cls} />;
    default:
      return <CheckCircle2 className={cls} />;
  }
}

/** Traduz código ISO de idioma pra nome em pt-BR */
export function languageName(code: string): string {
  const map: Record<string, string> = {
    "pt-br": "Português (BR)",
    "pt-pt": "Português (PT)",
    "pt": "Português",
    "en": "Inglês",
    "en-gb": "Inglês (UK)",
    "en-us": "Inglês (US)",
    "es": "Espanhol",
    "fr": "Francês",
    "de": "Alemão",
    "it": "Italiano",
    "nl": "Holandês",
    "ru": "Russo",
    "ja": "Japonês",
    "ko": "Coreano",
    "zh": "Chinês",
    "ar": "Árabe",
  };
  return map[code.toLowerCase()] || code;
}

// ============================================================
// Card de Oferta (bloco reservável)
// ============================================================

interface BlockCardProps {
  block: BookingBlock;
  roomDetails?: BookingRoomDetails;
  hotelId: string | number;
  currency: string;
}

export function HotelDetailBlockCard({
  block,
  roomDetails,
  hotelId,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  const photos = roomDetails?.photos || [];
  const coverPhoto =
    photos[0]?.url_max750 || photos[0]?.url_max500 || photos[0]?.url_original;

  const highlights = roomDetails?.highlights || [];
  const facilities = roomDetails?.facilities || [];
  const description = roomDetails?.description;

  // Cama
  const bedConfig = roomDetails?.bed_configurations?.[0]?.bed_types?.[0];
  const bedText = bedConfig?.name_with_count || bedConfig?.name;
  const bedWidth = bedConfig?.description;

  // Políticas
  const cancelPolicy = block.paymentterms?.cancellation;
  const prepayPolicy = block.paymentterms?.prepayment;
  const isNonRefundable = cancelPolicy?.type === "non_refundable";

  // Policies de texto (incl. refund schedule em R$)
  const policies = block.block_text?.policies || [];
  const refundSchedule = policies.find(
    (p) => p.class === "POLICY_REFUND_SCHEDULE",
  );
  const mealplanPolicy = policies.find(
    (p) => p.class === "POLICY_HOTEL_MEALPLAN",
  );

  // Bundle extras (ex: "Internet grátis")
  const bundleExtras = (block as any).bundle_extras?.benefits as
    | Array<{ title?: string; name?: string; details?: string[] }>
    | undefined;

  const openPhoto = (idx: number) => setGalleryIdx(idx);
  const closePhoto = () => setGalleryIdx(null);
  const prevPhoto = () =>
    setGalleryIdx((i) =>
      i === null ? i : (i - 1 + photos.length) % photos.length,
    );
  const nextPhoto = () =>
    setGalleryIdx((i) => (i === null ? i : (i + 1) % photos.length));

  const copyRoom = async () => {
    const lines: (string | null)[] = [
      `🛏️ ${block.name_without_policy || block.room_name || block.name}`,
      typeof block.room_surface_in_m2 === "number"
        ? `   ${block.room_surface_in_m2} m²`
        : null,
      bedText ? `   ${bedText}${bedWidth ? ` (${bedWidth})` : ""}` : null,
      typeof block.max_occupancy !== "undefined"
        ? `   Até ${block.max_occupancy} hóspede(s)`
        : null,
      block.breakfast_included
        ? "✅ Café da manhã incluso"
        : mealplanPolicy?.content
          ? `🍽️ ${mealplanPolicy.content.split("\n")[0]}`
          : null,
      block.can_reserve_free_parking ? "🅿️ Estacionamento grátis" : null,
      !isNonRefundable
        ? "✅ Parcialmente reembolsável"
        : "⚠️ Não reembolsável",
      refundSchedule?.content ? `   ${refundSchedule.content.trim()}` : null,
      prepayPolicy?.extended_type_translation
        ? `💳 ${prepayPolicy.extended_type_translation}`
        : null,
      bundleExtras?.[0]
        ? `🎁 Inclui: ${bundleExtras
            .map((b) => b.title || b.name)
            .filter(Boolean)
            .join(", ")}`
        : null,
      `🔗 https://www.booking.com/hotel.html?hotel_id=${hotelId}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Oferta copiada!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Foto */}
        {coverPhoto ? (
          <button
            type="button"
            onClick={() => openPhoto(0)}
            className="group relative block h-44 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-48"
          >
            <img
              src={coverPhoto}
              alt={block.room_name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                <ImageIcon className="h-3 w-3" />
                {photos.length}
              </div>
            )}
          </button>
        ) : (
          <div className="flex h-44 w-full shrink-0 items-center justify-center bg-muted text-muted-foreground sm:h-auto sm:w-48">
            <Bed className="h-8 w-8" />
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex flex-1 flex-col gap-2 p-3">
          {/* Nome + metadados físicos */}
          <div>
            <h4 className="text-sm font-semibold leading-tight">
              {block.name_without_policy || block.room_name || block.name}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {typeof block.max_occupancy !== "undefined" && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> até {block.max_occupancy}
                </span>
              )}
              {typeof block.room_surface_in_m2 === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Ruler className="h-3 w-3" />
                  {block.room_surface_in_m2} m²
                </span>
              )}
              {typeof block.number_of_bathrooms === "number" &&
                block.number_of_bathrooms > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Bath className="h-3 w-3" />
                    {block.number_of_bathrooms} banheiro
                    {block.number_of_bathrooms > 1 ? "s" : ""}
                  </span>
                )}
              {bedText && (
                <span className="inline-flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {bedText}
                  {bedWidth ? ` (${bedWidth})` : ""}
                </span>
              )}
            </div>
          </div>

          {/* Descrição */}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {/* Badges de políticas/inclusões */}
          <div className="flex flex-wrap gap-1.5">
            {isNonRefundable ? (
              <Badge
                className="border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                variant="secondary"
              >
                <Ban className="mr-1 h-3 w-3" /> Não reembolsável
              </Badge>
            ) : (
              <Badge
                className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                variant="secondary"
              >
                <ShieldCheck className="mr-1 h-3 w-3" />
                {cancelPolicy?.type_translation || "Reembolsável"}
              </Badge>
            )}
            {!!block.breakfast_included && (
              <Badge variant="outline" className="gap-1">
                <Coffee className="h-3 w-3" /> Café da manhã incluso
              </Badge>
            )}
            {!!block.can_reserve_free_parking && (
              <Badge variant="outline" className="gap-1">
                <Car className="h-3 w-3" /> Estacionamento grátis
              </Badge>
            )}
            {!!block.all_inclusive && (
              <Badge className="bg-amber-500 text-white">All inclusive</Badge>
            )}
            {!!block.half_board && <Badge variant="outline">Meia pensão</Badge>}
            {!!block.full_board && (
              <Badge variant="outline">Pensão completa</Badge>
            )}
            {typeof block.genius_discount_percentage === "number" &&
              block.genius_discount_percentage > 0 && (
                <Badge className="bg-blue-600 text-white">
                  Genius −{block.genius_discount_percentage}%
                </Badge>
              )}
            {!!block.is_last_minute_deal && (
              <Badge className="bg-orange-500 text-white">Last minute</Badge>
            )}
            {!!block.is_flash_deal && (
              <Badge className="bg-orange-600 text-white">Flash deal</Badge>
            )}
            {!!block.is_smart_deal && (
              <Badge className="bg-violet-600 text-white">Smart deal</Badge>
            )}
          </div>

          {/* Highlights do quarto */}
          {highlights.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {highlights.slice(0, 6).map((h, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px]"
                >
                  <FacilityIcon icon={h.icon} className="h-3 w-3" />
                  {h.translated_name}
                </li>
              ))}
            </ul>
          )}

          {/* Bundle extras (Internet grátis, etc) */}
          {bundleExtras && bundleExtras.length > 0 && (
            <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1 font-medium text-emerald-800 dark:text-emerald-300">
                <Gift className="h-3 w-3" /> Incluso na tarifa:
              </div>
              <ul className="ml-4 list-disc text-[10px] text-emerald-700 dark:text-emerald-400">
                {bundleExtras.map((b, i) => (
                  <li key={i}>
                    <strong>{b.title || b.name}</strong>
                    {b.details?.[0] && <> — {b.details[0]}</>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Refund schedule em R$ */}
          {refundSchedule?.content && (
            <div className="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <RefreshCw className="mr-1 inline h-3 w-3" />
              {refundSchedule.content.trim()}
            </div>
          )}

          {/* Ações */}
          <div className="mt-1 flex items-center justify-between gap-2 border-t pt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2 text-xs"
            >
              {expanded ? "Menos" : "Mais detalhes"}
            </Button>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={copyRoom}
              >
                <Copy className="mr-1 h-3 w-3" /> Copiar
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  window.open(
                    `https://www.booking.com/hotel.html?hotel_id=${hotelId}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <ExternalLink className="mr-1 h-3 w-3" /> Reservar
              </Button>
            </div>
          </div>

          {/* Expansão com texto completo de políticas */}
          {expanded && (
            <div className="mt-1 space-y-2 rounded border border-border/60 bg-muted/40 p-3 text-xs">
              {cancelPolicy?.description && (
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <Ban className="h-3 w-3 text-red-500" /> Cancelamento
                  </div>
                  <p className="text-muted-foreground">
                    {cancelPolicy.description}
                  </p>
                </div>
              )}
              {prepayPolicy?.description && (
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <DollarSign className="h-3 w-3 text-amber-600" /> Pré-pagamento
                  </div>
                  <p className="text-muted-foreground">
                    {prepayPolicy.description}
                  </p>
                </div>
              )}
              {mealplanPolicy?.content && (
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <Utensils className="h-3 w-3 text-emerald-600" /> Refeições
                  </div>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {mealplanPolicy.content}
                  </p>
                </div>
              )}
              {facilities.length > 0 && (
                <div>
                  <div className="mb-1 font-semibold">Comodidades do quarto</div>
                  <div className="flex flex-wrap gap-1">
                    {facilities.map((f, i) => (
                      <span
                        key={i}
                        className="rounded bg-background px-1.5 py-0.5 text-[10px]"
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox de fotos do quarto */}
      <Dialog open={galleryIdx !== null} onOpenChange={(o) => !o && closePhoto()}>
        <DialogContent className="max-w-4xl border-0 bg-black/95 p-0">
          <DialogTitle className="sr-only">Fotos do quarto</DialogTitle>
          {galleryIdx !== null && photos[galleryIdx] && (
            <div className="relative">
              <img
                src={
                  photos[galleryIdx].url_max1280 ||
                  photos[galleryIdx].url_max750 ||
                  photos[galleryIdx].url_original
                }
                alt=""
                className="max-h-[85vh] w-full object-contain"
              />
              {photos.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/70"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/70"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                    {galleryIdx + 1} / {photos.length}
                  </div>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 bg-black/40 text-white hover:bg-black/70"
                onClick={closePhoto}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
