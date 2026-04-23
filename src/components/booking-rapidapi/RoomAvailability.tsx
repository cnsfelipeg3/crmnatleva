import { useState } from "react";
import {
  Bed,
  Users,
  Check,
  Maximize2,
  Bath,
  Wifi,
  Snowflake,
  Tv,
  Car,
  Coffee,
  UtensilsCrossed,
  XCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useRoomList,
  type RoomOffer,
  type RoomDetail,
  type RoomPhoto,
} from "@/hooks/useBookingRapidApi";

interface Props {
  hotelId: string | number | null;
  hotelName?: string;
  minDate: string | null; // arrival_date
  maxDate: string | null; // departure_date
  adults?: number;
  childrenAges?: number[];
  rooms?: number;
}

/**
 * Booking.com não aceita URLs no formato `/hotel.html?hotel_id=...`.
 * A forma confiável de abrir a página correta é usar a busca por nome
 * (+ datas e ocupação quando disponíveis) — sempre cai no hotel certo.
 */
function buildBookingSearchUrl(opts: {
  hotelName?: string;
  arrival?: string | null;
  departure?: string | null;
  adults?: number;
  childrenAges?: number[];
  rooms?: number;
}): string {
  const params = new URLSearchParams();
  if (opts.hotelName) params.set("ss", opts.hotelName);
  if (opts.arrival) params.set("checkin", opts.arrival);
  if (opts.departure) params.set("checkout", opts.departure);
  if (opts.adults) params.set("group_adults", String(opts.adults));
  if (opts.rooms) params.set("no_rooms", String(opts.rooms));
  if (opts.childrenAges?.length) {
    params.set("group_children", String(opts.childrenAges.length));
    opts.childrenAges.forEach((age) => params.append("age", String(age)));
  }
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function fmt(value?: number, currency?: string): string {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(2)}`;
  }
}

function HighlightIcon({ icon, className }: { icon?: string; className?: string }) {
  const cls = className ?? "h-3 w-3";
  switch (icon) {
    case "wifi":
      return <Wifi className={cls} />;
    case "snowflake":
      return <Snowflake className={cls} />;
    case "screen":
    case "tv":
      return <Tv className={cls} />;
    case "bath":
      return <Bath className={cls} />;
    case "parking":
    case "car":
      return <Car className={cls} />;
    case "coffee":
      return <Coffee className={cls} />;
    case "restaurant":
      return <UtensilsCrossed className={cls} />;
    default:
      return <Check className={cls} />;
  }
}

function OfferCard({
  offer,
  roomDetail,
  hotelId,
  hotelName,
  arrival,
  departure,
  adults,
  childrenAges,
  rooms,
}: {
  offer: RoomOffer;
  roomDetail?: RoomDetail;
  hotelId: string | number | null;
  hotelName?: string;
  arrival?: string | null;
  departure?: string | null;
  adults?: number;
  childrenAges?: number[];
  rooms?: number;
}) {
  const bookingUrl = buildBookingSearchUrl({
    hotelName,
    arrival,
    departure,
    adults,
    childrenAges,
    rooms,
  });
  const [expanded, setExpanded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const pb = offer.product_price_breakdown ?? offer.price_breakdown;
  const grossValue = pb?.gross_amount?.value;
  const grossCurrency = pb?.gross_amount?.currency;
  const pricePerNight = pb?.gross_amount_per_night?.value;
  const strikedValue = pb?.strikethrough_amount?.value;
  const excludedValue = pb?.excluded_amount?.value;
  const excludedCurrency = pb?.excluded_amount?.currency;

  const isRefundable = offer.refundable === 1;
  const cancellationDesc = offer.paymentterms?.cancellation?.description;
  const refundableUntil = offer.refundable_until;

  const paymentType = offer.paymentterms?.prepayment?.simple_translation;
  const paymentDesc = offer.paymentterms?.prepayment?.description;

  const mealBadges: string[] = [];
  if (offer.breakfast_included) mealBadges.push("Café da manhã incluso");
  if (offer.half_board) mealBadges.push("Meia pensão");
  if (offer.full_board) mealBadges.push("Pensão completa");
  if (offer.all_inclusive) mealBadges.push("All inclusive");

  const dealBadges: string[] = [];
  if (offer.is_last_minute_deal) dealBadges.push("Oferta de última hora");
  if (offer.is_flash_deal) dealBadges.push("Oferta-relâmpago");
  if (offer.is_smart_deal) dealBadges.push("Smart Deal");

  const geniusPct = offer.genius_discount_percentage;

  const photos: RoomPhoto[] = Array.isArray(roomDetail?.photos)
    ? roomDetail!.photos!
    : [];
  const coverPhoto =
    photos[0]?.url_max750 || photos[0]?.url_max500 || photos[0]?.url_original;

  const highlights = Array.isArray(roomDetail?.highlights)
    ? roomDetail!.highlights!
    : [];

  const roomName =
    offer.name_without_policy || offer.room_name || offer.name || "Quarto";

  const copyOffer = async () => {
    const lines = [
      `🛏️ ${roomName}`,
      typeof offer.room_surface_in_m2 === "number"
        ? `   Área: ${offer.room_surface_in_m2} m²`
        : null,
      typeof offer.max_occupancy !== "undefined"
        ? `   Capacidade: até ${offer.max_occupancy} pessoa(s)`
        : null,
      isRefundable
        ? `✅ Cancelamento grátis${refundableUntil ? ` até ${refundableUntil}` : ""}`
        : "⚠️ Não reembolsável",
      paymentType ? `💳 ${paymentType}` : null,
      mealBadges.length ? `🍽️ ${mealBadges.join(" • ")}` : null,
      typeof grossValue === "number"
        ? `💰 Estadia: ${fmt(grossValue, grossCurrency)}`
        : null,
      typeof excludedValue === "number" && excludedValue > 0
        ? `🧾 Impostos: ${fmt(excludedValue, excludedCurrency)}`
        : null,
      typeof grossValue === "number" && typeof excludedValue === "number"
        ? `✅ TOTAL: ${fmt(grossValue + excludedValue, grossCurrency)}`
        : null,
      `🔗 ${bookingUrl}`,
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
        {coverPhoto ? (
          <button
            type="button"
            onClick={() => {
              setGalleryIdx(0);
              setGalleryOpen(true);
            }}
            className="group relative block h-44 w-full shrink-0 overflow-hidden bg-muted sm:h-auto sm:w-48"
          >
            <img
              src={coverPhoto}
              alt={roomName}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                <ImageIcon className="h-3 w-3" />
                {photos.length}
              </div>
            )}
          </button>
        ) : (
          <div className="flex h-44 w-full shrink-0 items-center justify-center bg-muted sm:h-auto sm:w-48">
            <Bed className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <div className="flex-1 space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-tight">
                {roomName}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {typeof offer.max_occupancy !== "undefined" && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    até {offer.max_occupancy}
                  </span>
                )}
                {typeof offer.room_surface_in_m2 === "number" && (
                  <span className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" />
                    {offer.room_surface_in_m2} m²
                  </span>
                )}
                {typeof offer.number_of_bathrooms === "number" &&
                  offer.number_of_bathrooms > 0 && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-3 w-3" />
                      {offer.number_of_bathrooms} banheiro
                      {offer.number_of_bathrooms > 1 ? "s" : ""}
                    </span>
                  )}
              </div>
            </div>

            <div className="text-right shrink-0">
              {typeof strikedValue === "number" &&
                strikedValue > (grossValue ?? 0) && (
                  <div className="text-xs text-muted-foreground line-through">
                    {fmt(strikedValue, grossCurrency)}
                  </div>
                )}
              <div className="text-lg font-bold leading-tight">
                {fmt(grossValue, grossCurrency)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                estadia total
              </div>
              {typeof excludedValue === "number" && excludedValue > 0 && (
                <div className="mt-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-500">
                  + {fmt(excludedValue, excludedCurrency)} imp./taxas
                </div>
              )}
              {typeof pricePerNight === "number" && (
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  ~ {fmt(pricePerNight, grossCurrency)}/noite
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {isRefundable ? (
              <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Cancelamento grátis
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300">
                <XCircle className="h-3 w-3" />
                Não reembolsável
              </Badge>
            )}
            {mealBadges.map((b, i) => (
              <Badge key={`meal-${i}`} variant="secondary" className="gap-1">
                <Coffee className="h-3 w-3" />
                {b}
              </Badge>
            ))}
            {offer.can_reserve_free_parking ? (
              <Badge variant="secondary" className="gap-1">
                <Car className="h-3 w-3" /> Estacionamento grátis
              </Badge>
            ) : null}
            {dealBadges.map((b, i) => (
              <Badge key={`deal-${i}`} variant="default" className="bg-amber-500 hover:bg-amber-500">
                {b}
              </Badge>
            ))}
            {typeof geniusPct === "number" && geniusPct > 0 && (
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-600">
                Genius −{geniusPct}%
              </Badge>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {highlights.slice(0, 6).map((h, i) => (
                <span key={i} className="flex items-center gap-1">
                  <HighlightIcon icon={h.icon} />
                  {h.translated_name}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 px-2 text-xs"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" /> Menos detalhes
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" /> Ver políticas
                </>
              )}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyOffer} className="h-7 px-2 text-xs">
                <Copy className="h-3 w-3 mr-1" /> Copiar
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
                <ExternalLink className="h-3 w-3 mr-1" /> Reservar
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-3 text-xs">
              {cancellationDesc && (
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <Clock className="h-3 w-3" />
                    Política de cancelamento
                  </div>
                  <p className="whitespace-pre-line text-muted-foreground">
                    {cancellationDesc}
                  </p>
                </div>
              )}
              {paymentType && (
                <div>
                  <div className="mb-1 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Pagamento — {paymentType}
                  </div>
                  {paymentDesc && (
                    <p className="whitespace-pre-line text-muted-foreground">
                      {paymentDesc}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl bg-background p-2">
          <DialogTitle className="sr-only">Fotos — {roomName}</DialogTitle>
          {photos[galleryIdx] && (
            <div className="relative">
              <img
                src={
                  photos[galleryIdx].url_max1280 ||
                  photos[galleryIdx].url_max750 ||
                  photos[galleryIdx].url_original
                }
                alt={`${roomName} ${galleryIdx + 1}`}
                className="max-h-[80vh] w-full rounded object-contain"
              />
              {photos.length > 1 && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryIdx(
                        (galleryIdx - 1 + photos.length) % photos.length,
                      )
                    }
                    className="rounded px-3 py-1 hover:bg-muted"
                  >
                    ‹ Anterior
                  </button>
                  <span className="text-muted-foreground">
                    {galleryIdx + 1} / {photos.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryIdx((galleryIdx + 1) % photos.length)
                    }
                    className="rounded px-3 py-1 hover:bg-muted"
                  >
                    Próxima ›
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function RoomAvailability({
  hotelId,
  minDate,
  maxDate,
  adults,
  childrenAges,
  rooms,
}: Props) {
  const { data, isLoading, isError } = useRoomList(hotelId, minDate, maxDate, {
    adults,
    children_age: childrenAges?.join(","),
    room_qty: rooms,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Não foi possível carregar a lista de quartos. Tente novamente em
        instantes.
      </div>
    );
  }

  const offers = data.offers || [];

  if (!offers.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nenhuma oferta disponível para as datas informadas.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {offers.length}{" "}
        {offers.length === 1 ? "oferta disponível" : "ofertas disponíveis"}{" "}
        para {minDate} → {maxDate}
      </div>
      {offers.map((offer) => (
        <OfferCard
          key={offer.block_id}
          offer={offer}
          roomDetail={data.rooms?.[String(offer.room_id)]}
          hotelId={hotelId}
        />
      ))}
    </div>
  );
}
