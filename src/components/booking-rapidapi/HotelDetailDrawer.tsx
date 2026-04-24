import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  MapPin,
  Calendar,
  Users,
  Copy,
  ExternalLink,
  AlertTriangle,
  Info,
  Wifi,
  Coffee,
  Utensils,
  Languages,
  Sparkles,
  Receipt,
  ChevronLeft,
  ChevronRight,
  X,
  Hotel as HotelIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHotelDetails } from "@/hooks/useBookingRapidApi";
import { HotelReviews } from "./HotelReviews";
import {
  HotelDetailBlockCard,
  FacilityIcon,
  languageName,
} from "./HotelDetailBlockCard";
import {
  resizeBookingPhoto,
  type BookingHotel,
  type BookingBlock,
  type BookingRoomDetails,
  type BookingMoney,
} from "./types";

interface Props {
  hotel: BookingHotel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrival: string | null;
  departure: string | null;
  adults: number;
  childrenAges: number[];
  rooms: number;
  /** Quando true, renderiza só o conteúdo interno (sem wrapper Sheet) — usado pelo UnifiedHotelDetailDrawer */
  embedded?: boolean;
}

// ============================================================
// Helpers
// ============================================================

function fmt(v?: number, c?: string) {
  if (typeof v !== "number") return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: c || "BRL",
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return `${c || ""} ${v.toFixed(2)}`;
  }
}

/** Lê valor de um BookingMoney */
function money(m?: BookingMoney): { value?: number; display: string } {
  if (!m) return { value: undefined, display: "—" };
  return {
    value: m.value,
    display: m.amount_unrounded || m.amount_rounded || fmt(m.value, m.currency),
  };
}

// ============================================================
// Componente principal
// ============================================================

export function HotelDetailDrawer({
  hotel,
  open,
  onOpenChange,
  arrival,
  departure,
  adults,
  childrenAges,
  rooms,
  embedded = false,
}: Props) {
  const { data: details, isLoading } = useHotelDetails(
    hotel?.hotel_id ?? null,
    arrival,
    departure,
    {
      adults,
      children_age: childrenAges.join(","),
      room_qty: rooms,
    },
  );

  if (!hotel) return null;

  const h: BookingHotel = { ...hotel, ...((details ?? {}) as BookingHotel) };

  const hotelId = h.hotel_id;
  const hotelName = h.name || h.hotel_name || "Hotel";

  const address = h.address;
  const district = h.district;
  const zip = h.zip;
  const cityTrans = h.city_trans || h.city;
  const distanceCc = typeof h.distance_to_cc === "number" ? h.distance_to_cc : null;
  const accommodationType = h.accommodation_type_name;
  const availableRooms = h.available_rooms;

  const reviewScore = h.reviewScore;
  const reviewWord = h.reviewScoreWord;
  const reviewCount = h.reviewCount ?? h.review_nr;
  const wifiScore = (h as any).wifi_review_score?.rating as number | undefined;
  const breakfastScore = h.breakfast_review_score;

  const mainPhoto = h.main_photo_url || h.photoUrls?.[0];

  const ppb = h.product_price_breakdown || h.composite_price_breakdown;
  const grossAmount = ppb?.gross_amount;
  const grossPerNight = ppb?.gross_amount_per_night;
  const strikeAmount = ppb?.strikethrough_amount;
  const strikePerNight = ppb?.strikethrough_amount_per_night;
  const allInclusiveAmount = ppb?.all_inclusive_amount;
  const netAmount = ppb?.net_amount;
  const excludedAmount = ppb?.excluded_amount;
  const includedTaxes = ppb?.included_taxes_and_charges_amount;
  const priceItems = ppb?.items ?? [];
  const priceBenefits = ppb?.benefits ?? [];
  const discountedAmount = ppb?.discounted_amount;
  const nrStays = ppb?.nr_stays;

  const currency =
    grossAmount?.currency ??
    h.priceBreakdown?.grossPrice?.currency ??
    "BRL";

  const blocks: BookingBlock[] = Array.isArray(h.block) ? h.block : [];
  const roomsMap: Record<string, BookingRoomDetails> = h.rooms ?? {};

  const houseRules = h.booking_home?.house_rules || [];
  const isVacationRental = !!h.booking_home?.is_vacation_rental;

  const popularFacilities = h.facilities_block?.facilities || [];
  const topUfiBenefits = h.top_ufi_benefits || [];
  const propertyHighlightStrip = (h as any).property_highlight_strip as
    | Array<{ name?: string; icon_list?: Array<{ icon?: string }> }>
    | undefined;
  const familyFacilities = h.family_facilities || [];
  const kitchenFacilities = h.aggregated_data?.common_kitchen_fac || [];

  const languages = h.languages_spoken?.languagecode || h.spoken_languages || [];

  const importantInfo = h.hotel_important_information_with_codes || [];

  const copyInfo = async () => {
    const lines: (string | null)[] = [
      `🏨 ${hotelName}`,
      accommodationType ? `   ${accommodationType}` : null,
      address
        ? `📍 ${address}${district ? `, ${district}` : ""}${
            cityTrans ? `, ${cityTrans}` : ""
          }${zip ? ` — ${zip}` : ""}`
        : null,
      distanceCc ? `   ${distanceCc.toFixed(1)} km do centro` : null,
      typeof reviewScore === "number"
        ? `⭐ ${reviewScore.toFixed(1)} ${reviewWord || ""} (${reviewCount || 0} avaliações)`
        : null,
      arrival && departure ? `📅 ${arrival} → ${departure}` : null,
      `👥 ${adults} adulto(s)${
        childrenAges.length ? ` + ${childrenAges.length} criança(s)` : ""
      }, ${rooms} quarto(s)`,
      grossAmount ? `💰 Estadia: ${money(grossAmount).display}` : null,
      excludedAmount && (excludedAmount.value ?? 0) > 0
        ? `🧾 Impostos/taxas: ${money(excludedAmount).display}`
        : null,
      allInclusiveAmount
        ? `✅ TOTAL FINAL: ${money(allInclusiveAmount).display}`
        : null,
      grossPerNight ? `   ~${money(grossPerNight).display}/noite` : null,
      `🔗 https://www.booking.com/hotel.html?hotel_id=${hotelId}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Informações copiadas!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const openOnBooking = () => {
    const url =
      h.url || `https://www.booking.com/hotel.html?hotel_id=${hotelId}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Hotel photos — combinando main + photoUrls + rooms[].photos
  const allPhotos: { url: string; id?: string | number }[] = [];
  if (mainPhoto) {
    allPhotos.push({
      url: resizeBookingPhoto(mainPhoto, "max1024x768"),
      id: "main",
    });
  }
  (h.photoUrls || []).forEach((p, i) => {
    allPhotos.push({
      url: resizeBookingPhoto(p, "max1024x768"),
      id: `hp${i}`,
    });
  });
  Object.values(roomsMap).forEach((r) =>
    (r.photos || []).forEach((p) => {
      const url = p.url_max750 || p.url_max500 || p.url_original;
      if (url)
        allPhotos.push({ url, id: p.photo_id ?? `r${Math.random()}` });
    }),
  );
  const seenUrls = new Set<string>();
  const uniquePhotos = allPhotos.filter((p) => {
    if (seenUrls.has(p.url)) return false;
    seenUrls.add(p.url);
    return true;
  });

  const inner = (
    <div className="flex h-full flex-col">
          {/* HEADER */}
          <SheetHeader className="shrink-0 border-b bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate text-base">
                  {hotelName}
                </SheetTitle>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">
                    {address ? (
                      <>
                        {address}
                        {district && `, ${district}`}
                        {cityTrans && ` — ${cityTrans}`}
                      </>
                    ) : (
                      h.wishlistName || cityTrans
                    )}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {accommodationType && (
                    <Badge variant="outline" className="gap-1">
                      <HotelIcon className="h-3 w-3" /> {accommodationType}
                    </Badge>
                  )}
                  {typeof reviewScore === "number" && (
                    <Badge variant="secondary">
                      <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                      {reviewScore.toFixed(1)} {reviewWord}
                      {typeof reviewCount === "number" && reviewCount > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({reviewCount})
                        </span>
                      )}
                    </Badge>
                  )}
                  {typeof distanceCc === "number" && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {distanceCc.toFixed(1)} km do centro
                    </Badge>
                  )}
                  {arrival && departure && (
                    <Badge variant="outline">
                      <Calendar className="mr-1 h-3 w-3" />
                      {arrival} → {departure}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    <Users className="mr-1 h-3 w-3" />
                    {adults + childrenAges.length} hósp. · {rooms} quarto(s)
                  </Badge>
                  {typeof availableRooms === "number" && availableRooms > 0 && availableRooms <= 5 && (
                    <Badge className="bg-amber-500 text-white">
                      Restam {availableRooms}!
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Breakdown de preço compacto */}
            {grossAmount && (
              <div className="mt-3 rounded-md border bg-muted/40 p-3">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estadia</span>
                    <span className="font-medium">
                      {money(grossAmount).display}
                    </span>
                  </div>
                  {excludedAmount && (excludedAmount.value ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Impostos e taxas
                      </span>
                      <span className="font-medium text-amber-700 dark:text-amber-500">
                        + {money(excludedAmount).display}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between border-t pt-1">
                    <span className="text-sm font-semibold">Total final</span>
                    <span className="text-base font-bold">
                      {money(allInclusiveAmount || grossAmount).display}
                    </span>
                  </div>
                  {grossPerNight && (
                    <div className="text-right text-[10px] text-muted-foreground">
                      ~ {money(grossPerNight).display}/noite
                      {typeof nrStays === "number" && ` · ${nrStays} noite${nrStays > 1 ? "s" : ""}`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={copyInfo}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copiar info
              </Button>
              <Button size="sm" variant="outline" onClick={openOnBooking}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir no Booking
              </Button>
            </div>
          </SheetHeader>

          {/* TABS */}
          <Tabs defaultValue="fotos" className="flex flex-1 flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 grid shrink-0 grid-cols-5">
              <TabsTrigger value="fotos">Fotos</TabsTrigger>
              <TabsTrigger value="sobre">Sobre</TabsTrigger>
              <TabsTrigger value="quartos">Quartos</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4">
                {/* FOTOS */}
                <TabsContent value="fotos" className="mt-0">
                  {uniquePhotos.length === 0 ? (
                    <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nenhuma foto disponível
                    </div>
                  ) : (
                    <PhotoGrid photos={uniquePhotos} hotelName={hotelName} />
                  )}
                </TabsContent>

                {/* SOBRE */}
                <TabsContent value="sobre" className="mt-0 space-y-3">
                  {importantInfo.length > 0 && (
                    <Card className="border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        Informações importantes
                      </h4>
                      <ul className="space-y-1">
                        {importantInfo.map((info, i) => (
                          <li key={i} className="text-xs text-amber-800 dark:text-amber-300">
                            • {info.phrase}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {propertyHighlightStrip && propertyHighlightStrip.length > 0 && (
                    <Card className="p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4" /> Destaques da propriedade
                      </h4>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {propertyHighlightStrip.map((hl, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1.5 text-xs"
                          >
                            <FacilityIcon icon={hl.icon_list?.[0]?.icon} />
                            <span>{hl.name}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {(popularFacilities.length > 0 || familyFacilities.length > 0) && (
                    <Card className="p-4">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4" /> Comodidades
                      </h4>
                      {popularFacilities.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {popularFacilities.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <FacilityIcon icon={f.icon} />
                              <span>{f.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {familyFacilities.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <div className="mb-1 text-xs font-medium text-muted-foreground">
                            Para famílias
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {familyFacilities.map((f, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">
                                {f}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )}

                  {topUfiBenefits.length > 0 && (
                    <Card className="p-4">
                      <h4 className="mb-2 text-sm font-semibold">
                        Principais benefícios aqui
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {topUfiBenefits.map((b, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                          >
                            <FacilityIcon icon={b.icon} className="h-3 w-3" />
                            {b.translated_name || b.name}
                          </span>
                        ))}
                      </div>
                    </Card>
                  )}

                  {(typeof wifiScore === "number" ||
                    (Number(breakfastScore?.review_score) || 0) > 0) && (
                    <Card className="p-4">
                      <h4 className="mb-2 text-sm font-semibold">Notas por categoria</h4>
                      <div className="space-y-2 text-xs">
                        {typeof wifiScore === "number" && wifiScore > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Wifi className="h-3 w-3" /> Wi-Fi
                            </span>
                            <Badge variant="secondary">{wifiScore.toFixed(1)}</Badge>
                          </div>
                        )}
                        {breakfastScore && (Number(breakfastScore.review_score) || 0) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Coffee className="h-4 w-4" /> Café da manhã
                            </span>
                            <Badge variant="secondary">
                              {Number(breakfastScore.review_score).toFixed(1)} ·{" "}
                              {breakfastScore.review_score_word}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {kitchenFacilities.length > 0 && (
                    <Card className="p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Utensils className="h-4 w-4" /> Cozinha compartilhada
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {kitchenFacilities.map((k, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {k.name}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {languages.length > 0 && (
                    <Card className="p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Languages className="h-4 w-4" /> Idiomas falados
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {languages.map((code, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {languageName(code)}
                          </Badge>
                        ))}
                      </div>
                    </Card>
                  )}

                  {houseRules.length > 0 && (
                    <Card className="p-4">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <Info className="h-4 w-4" /> Regras da propriedade
                      </h4>
                      <ul className="space-y-1.5">
                        {houseRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <FacilityIcon icon={rule.icon} className="mt-0.5 h-3 w-3 shrink-0" />
                            <div>
                              <strong>{rule.title}:</strong>{" "}
                              <span className="text-muted-foreground">
                                {rule.description}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {(isVacationRental || h.booking_home?.is_aparthotel) && (
                    <div className="flex flex-wrap gap-1.5">
                      {isVacationRental && (
                        <Badge variant="secondary">Propriedade de férias</Badge>
                      )}
                      {!!h.booking_home?.is_aparthotel && (
                        <Badge variant="secondary">Apart hotel</Badge>
                      )}
                    </div>
                  )}

                  {(h.checkin?.fromTime || h.checkout?.untilTime) && (
                    <Card className="p-4">
                      <h4 className="mb-2 text-sm font-semibold">Horários</h4>
                      <div className="space-y-1 text-xs">
                        {h.checkin?.fromTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Check-in</span>
                            <span>
                              {h.checkin.fromTime}
                              {h.checkin.untilTime && ` — ${h.checkin.untilTime}`}
                            </span>
                          </div>
                        )}
                        {h.checkout?.untilTime && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Check-out</span>
                            <span>
                              {h.checkout.fromTime && `${h.checkout.fromTime} — `}
                              {h.checkout.untilTime}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* QUARTOS */}
                <TabsContent value="quartos" className="mt-0">
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                      ))}
                    </div>
                  ) : blocks.length === 0 ? (
                    <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Sem ofertas disponíveis para as datas informadas.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">
                        <strong>{blocks.length}</strong>{" "}
                        {blocks.length === 1
                          ? "oferta disponível"
                          : "ofertas disponíveis"}
                      </div>
                      {blocks.map((block) => (
                        <HotelDetailBlockCard
                          key={block.block_id}
                          block={block}
                          roomDetails={roomsMap[String(block.room_id)]}
                          hotelId={hotelId}
                          currency={currency}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* PREÇOS */}
                <TabsContent value="precos" className="mt-0 space-y-3">
                  {!ppb ? (
                    <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Detalhamento de preço não disponível.
                    </div>
                  ) : (
                    <>
                      <Card className="p-4">
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <Receipt className="h-4 w-4" /> Composição do preço
                        </h4>
                        <dl className="space-y-1.5 text-xs">
                          {grossAmount && (
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">
                                Tarifa base
                                {typeof nrStays === "number" &&
                                  ` (${nrStays} ${nrStays > 1 ? "noites" : "noite"})`}
                              </dt>
                              <dd className="font-medium">
                                {money(grossAmount).display}
                              </dd>
                            </div>
                          )}
                          {grossPerNight && (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <dt>Por noite</dt>
                              <dd>{money(grossPerNight).display}</dd>
                            </div>
                          )}
                          {strikeAmount && strikeAmount.value !== grossAmount?.value && (
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">Preço original</dt>
                              <dd className="line-through text-muted-foreground">
                                {money(strikeAmount).display}
                              </dd>
                            </div>
                          )}
                          {strikePerNight &&
                            strikePerNight.value !== grossPerNight?.value && (
                              <div className="flex items-center justify-between text-muted-foreground">
                                <dt>Por noite original</dt>
                                <dd className="line-through">
                                  {money(strikePerNight).display}
                                </dd>
                              </div>
                            )}
                          {discountedAmount && (discountedAmount.value ?? 0) > 0 && (
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">
                                Desconto aplicado
                              </dt>
                              <dd className="font-medium text-emerald-700 dark:text-emerald-500">
                                − {money(discountedAmount).display}
                              </dd>
                            </div>
                          )}
                        </dl>
                      </Card>

                      {priceItems.length > 0 && (
                        <Card className="p-4">
                          <h4 className="mb-3 text-sm font-semibold">
                            Impostos, taxas e descontos
                          </h4>
                          <ul className="space-y-2">
                            {priceItems.map((item, i) => {
                              const isDiscount = item.kind === "discount";
                              const isExcluded = item.inclusion_type === "excluded";
                              return (
                                <li
                                  key={i}
                                  className="flex items-start justify-between gap-2 border-b border-border/30 pb-2 last:border-0 last:pb-0"
                                >
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium">
                                      {item.name}
                                      {isExcluded && (
                                        <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                          Não incluso
                                        </span>
                                      )}
                                      {item.inclusion_type === "included" && (
                                        <span className="ml-1 rounded bg-emerald-100 px-1 text-[9px] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Incluso
                                        </span>
                                      )}
                                    </div>
                                    {item.details && (
                                      <div className="text-[10px] text-muted-foreground">
                                        {item.details}
                                      </div>
                                    )}
                                  </div>
                                  <div
                                    className={cn(
                                      "shrink-0 text-xs font-semibold",
                                      isDiscount
                                        ? "text-emerald-700 dark:text-emerald-500"
                                        : "text-amber-700 dark:text-amber-500",
                                    )}
                                  >
                                    {isDiscount ? "− " : ""}
                                    {money(item.item_amount).display}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </Card>
                      )}

                      {priceBenefits.length > 0 && (
                        <Card className="p-4">
                          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            Benefícios aplicados
                          </h4>
                          <ul className="space-y-2">
                            {priceBenefits.map((b, i) => (
                              <li
                                key={i}
                                className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs dark:border-emerald-900 dark:bg-emerald-950/20"
                              >
                                <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                                  {b.name}
                                </div>
                                {b.details && (
                                  <div className="text-emerald-700 dark:text-emerald-400">
                                    {b.details}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}

                      <Card className="p-4">
                        <h4 className="mb-2 text-sm font-semibold">Totais</h4>
                        <dl className="space-y-1.5 text-xs">
                          {netAmount && (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <dt>Valor líquido</dt>
                              <dd>{money(netAmount).display}</dd>
                            </div>
                          )}
                          {includedTaxes && (includedTaxes.value ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-muted-foreground">
                              <dt>+ Impostos inclusos</dt>
                              <dd>{money(includedTaxes).display}</dd>
                            </div>
                          )}
                          {excludedAmount && (excludedAmount.value ?? 0) > 0 && (
                            <div className="flex items-center justify-between">
                              <dt className="text-muted-foreground">
                                + Impostos/taxas a pagar na chegada
                              </dt>
                              <dd className="font-medium text-amber-700 dark:text-amber-500">
                                {money(excludedAmount).display}
                              </dd>
                            </div>
                          )}
                          <div className="mt-1 flex items-center justify-between border-t pt-1.5">
                            <dt className="font-semibold">TOTAL FINAL</dt>
                            <dd className="text-base font-bold">
                              {money(allInclusiveAmount || grossAmount).display}
                            </dd>
                          </div>
                        </dl>
                      </Card>
                    </>
                  )}
                </TabsContent>

                {/* REVIEWS */}
                <TabsContent value="reviews" className="mt-0">
                  <HotelReviews hotelId={hotelId} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
  );

  if (embedded) return inner;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden p-0 sm:max-w-3xl"
      >
        {inner}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Grid de fotos (com lightbox)
// ============================================================

function PhotoGrid({
  photos,
  hotelName,
}: {
  photos: { url: string; id?: string | number }[];
  hotelName: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const open = (i: number) => setLightbox(i);
  const close = () => setLightbox(null);
  const prev = () =>
    setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const next = () =>
    setLightbox((i) => (i === null ? i : (i + 1) % photos.length));

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={String(p.id ?? i)}
            type="button"
            onClick={() => open(i)}
            className="group relative aspect-square overflow-hidden rounded-md bg-muted transition-transform duration-200 hover:scale-[1.02]"
          >
            <img
              src={p.url}
              alt={`${hotelName} - Foto ${i + 1}`}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </button>
        ))}
      </div>
      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-5xl border-0 bg-black/95 p-0">
          <DialogTitle className="sr-only">Galeria</DialogTitle>
          {lightbox !== null && (
            <div className="relative">
              <img
                src={photos[lightbox].url.replace(
                  /\/(square\d+|max\d+x?\d*)\//,
                  "/max1440x1080/",
                )}
                alt=""
                className="max-h-[85vh] w-full object-contain"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/70"
                onClick={prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/70"
                onClick={next}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-xs text-white">
                {lightbox + 1} / {photos.length}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 bg-black/40 text-white hover:bg-black/70"
                onClick={close}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
